/**
 * Brings the live demo's website plans in line with constants/plan-benefits.ts and server/website/catalogue.ts.
 * Dry run by default: prints what would change and changes nothing.
 *   npm run db:update-catalogue              -> dry run
 *   npm run db:update-catalogue -- --apply   -> makes the changes
 * Uses DATABASE_URL when it is set, otherwise the local PGlite folder (PGLITE_DIR). Safe to repeat.
 *
 * 1. Gives every car, travel, home and health plan its product's benefit list (a travel plan stops listing
 *    "Roadside assistance", a car plan stops listing a benefit it also sells as an add-on).
 * 2. Domestic helper cover on home plans stops being ticked by default.
 */
import { and, eq, inArray } from "drizzle-orm";
import { planBenefits } from "@/constants/plan-benefits";
import { WEBSITE_PRODUCTS } from "@/constants/website";
import { PGLITE_DIR, db, schema } from "@/server/db";

const { plans, insurers, planAddOns } = schema;

const apply = process.argv.includes("--apply");

async function main() {
  const target = process.env.DATABASE_URL ? `Postgres at ${new URL(process.env.DATABASE_URL).host}` : PGLITE_DIR;
  console.log(`${apply ? "APPLY" : "DRY RUN"} on ${target}\n`);

  const rows = await db
    .select({ plan: plans, insurer: insurers.name })
    .from(plans)
    .innerJoin(insurers, eq(plans.insurerId, insurers.id))
    .where(inArray(plans.product, [...WEBSITE_PRODUCTS]))
    .orderBy(plans.product, plans.id);
  const changes = rows
    .map(({ plan, insurer }) => ({ plan, benefits: planBenefits(plan.product, plan.cover, insurer) }))
    .filter(({ plan, benefits }) => plan.benefits.join("|") !== benefits.join("|"));

  console.log(`Plans with new benefits: ${changes.length} of ${rows.length}`);
  for (const { plan, benefits } of changes) {
    console.log(`  #${plan.id} ${plan.product} ${plan.name.en}`);
    console.log(`    was: ${plan.benefits.join(", ") || "none"}`);
    console.log(`    now: ${benefits.join(", ")}`);
  }

  const helperWhere = and(eq(planAddOns.key, "domestic_helper"), eq(planAddOns.kind, "preselected"));
  const helpers = await db.select({ id: planAddOns.id }).from(planAddOns).where(helperWhere);
  console.log(`\nDomestic helper add-ons ticked by default, to make optional: ${helpers.length}`);

  if (!apply) {
    console.log("\nDry run: nothing changed. Run again with --apply to make these changes.");
    process.exit(0);
  }

  for (const { plan, benefits } of changes) await db.update(plans).set({ benefits }).where(eq(plans.id, plan.id));
  if (helpers.length) await db.update(planAddOns).set({ kind: "optional" }).where(helperWhere);
  console.log("\nDone.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
