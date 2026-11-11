import { and, eq, notExists } from "drizzle-orm";
import { CAR_ADD_ONS, type AddOnKind, type CarAddOnKey } from "@/constants/add-ons";
import { db, schema } from "@/server/db";

const { plans, planAddOns } = schema;

/** Which car add-ons a plan gets and how. Fixed by cover and id, so every run gives the same set. */
function carAddOnKinds(plan: { id: number; cover: string }): Partial<Record<CarAddOnKey, AddOnKind>> {
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
}

/**
 * Gives every active car plan that has no add-ons yet its default set. Returns the rows added.
 * Safe to run again: plans that already have add-ons are skipped, so live data is never duplicated.
 */
export async function ensureCarAddOns(): Promise<number> {
  const bare = await db
    .select({ id: plans.id, cover: plans.cover })
    .from(plans)
    .where(
      and(
        eq(plans.product, "car"),
        eq(plans.active, true),
        notExists(db.select({ id: planAddOns.id }).from(planAddOns).where(eq(planAddOns.planId, plans.id))),
      ),
    );

  const rows = bare.flatMap((plan) => {
    const kinds = carAddOnKinds(plan);
    return CAR_ADD_ONS.flatMap(({ key, name, price }) => {
      const kind = kinds[key];
      return kind ? [{ planId: plan.id, key, name, kind, price: kind === "included" ? 0 : price }] : [];
    });
  });
  if (rows.length === 0) return 0;

  const inserted = await db.insert(planAddOns).values(rows).onConflictDoNothing().returning({ id: planAddOns.id });
  return inserted.length;
}
