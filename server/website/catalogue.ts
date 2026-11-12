import { and, eq, inArray, notExists } from "drizzle-orm";
import { WEBSITE_ADD_ONS, type AddOnKey, type AddOnKind } from "@/constants/add-ons";
import { WEBSITE_PRODUCTS, type WebsiteProduct } from "@/constants/website";
import { db, schema } from "@/server/db";

const { plans, planAddOns } = schema;

type Plan = { id: number; cover: string };

/** Which add-ons a plan of each product gets and how. Fixed by cover and id, so every run gives the same set. */
const ADD_ON_KINDS: { [P in WebsiteProduct]: (plan: Plan) => Partial<Record<AddOnKey<P>, AddOnKind>> } = {
  car: (plan) => {
    if (plan.cover === "third_party") {
      return { roadside_assistance: "optional", driver_accident: "optional", passenger_accident: "optional" };
    }
    return {
      roadside_assistance: "included",
      replacement_car: plan.cover === "comprehensive_agency" ? "included" : "optional",
      driver_accident: "preselected",
      passenger_accident: "optional",
      windscreen: "optional",
      // Only some plans offer it, so the plans page shows that add-ons differ between plans
      ...(plan.id % 2 === 0 && { regional_cover: "optional" as const }),
    };
  },
  travel: (plan) => ({
    trip_cancellation: plan.cover === "annual_multi_trip" ? "included" : "optional",
    baggage_delay: "preselected",
    adventure_sports: "optional",
    covid_cover: "optional",
  }),
  home: (plan) => ({
    accidental_damage: "optional",
    valuables_away: "optional",
    alternative_accommodation: plan.cover === "building_contents" ? "included" : "optional",
    domestic_helper: "preselected",
  }),
  health: () => ({ dental: "optional", optical: "optional", maternity: "optional", wellness_checkup: "included" }),
};

/** The add-on rows for one plan of a product. */
function addOnRows(product: WebsiteProduct, plan: Plan) {
  const kinds: Partial<Record<string, AddOnKind>> = ADD_ON_KINDS[product](plan);
  return WEBSITE_ADD_ONS[product].flatMap(({ key, name, price }) => {
    const kind = kinds[key];
    return kind ? [{ planId: plan.id, key, name, kind, price: kind === "included" ? 0 : price }] : [];
  });
}

/**
 * Gives every active plan of a website product that has no add-ons yet its default set. Returns the rows added.
 * Safe to run again: plans that already have add-ons are skipped, so live data is never duplicated.
 */
export async function ensureAddOns(): Promise<number> {
  const bare = await db
    .select({ id: plans.id, cover: plans.cover, product: plans.product })
    .from(plans)
    .where(
      and(
        inArray(plans.product, [...WEBSITE_PRODUCTS]),
        eq(plans.active, true),
        notExists(db.select({ id: planAddOns.id }).from(planAddOns).where(eq(planAddOns.planId, plans.id))),
      ),
    );

  const rows = bare.flatMap((plan) => addOnRows(plan.product as WebsiteProduct, plan));
  if (rows.length === 0) return 0;

  const inserted = await db.insert(planAddOns).values(rows).onConflictDoNothing().returning({ id: planAddOns.id });
  return inserted.length;
}
