import { and, asc, count, eq, inArray } from "drizzle-orm";
import type { Product } from "@/constants/products";
import { plansByInsurer } from "@/lib/plans";
import { db, schema } from "@/server/db";

const { insurers, plans, planAddOns } = schema;

/**
 * Every insurer with its active plans counted per product. The counts come from one grouped query: a correlated
 * subquery here once compared plans.insurer_id with plans.id (Drizzle drops the table names inside a select's sql),
 * so every insurer showed "1 plan".
 */
export async function listInsurers() {
  const [rows, counts] = await Promise.all([
    db
      .select({ id: insurers.id, name: insurers.name, contactEmail: insurers.contactEmail, active: insurers.active })
      .from(insurers)
      .orderBy(insurers.name),
    db
      .select({ insurerId: plans.insurerId, product: plans.product, count: count() })
      .from(plans)
      .where(eq(plans.active, true))
      .groupBy(plans.insurerId, plans.product),
  ]);
  const byInsurer = plansByInsurer(counts);
  return rows.map((insurer) => ({ ...insurer, plans: byInsurer.get(insurer.id) ?? [] }));
}

/** How many plans each product has: active ones, or all of them when inactive plans are shown too. */
export async function countPlansByProduct(withInactive: boolean) {
  const rows = await db
    .select({ product: plans.product, count: count() })
    .from(plans)
    .where(withInactive ? undefined : eq(plans.active, true))
    .groupBy(plans.product);
  return new Map(rows.map((r) => [r.product, r.count]));
}

/** A product's plans with their insurer and every add-on row (retired ones too, so an admin can offer them again). */
export async function listPlans(
  product: Product,
  { insurerId, withInactive }: { insurerId?: number; withInactive: boolean },
) {
  const rows = await db
    .select({ plan: plans, insurerName: insurers.name, insurerActive: insurers.active })
    .from(plans)
    .innerJoin(insurers, eq(plans.insurerId, insurers.id))
    .where(
      and(
        eq(plans.product, product),
        insurerId ? eq(plans.insurerId, insurerId) : undefined,
        withInactive ? undefined : eq(plans.active, true),
      ),
    )
    .orderBy(insurers.name, plans.basePremium);
  const addOns = rows.length
    ? await db
        .select()
        .from(planAddOns)
        .where(
          inArray(
            planAddOns.planId,
            rows.map((r) => r.plan.id),
          ),
        )
        .orderBy(asc(planAddOns.id))
    : [];
  return rows.map((r) => ({ ...r, addOns: addOns.filter((a) => a.planId === r.plan.id) }));
}
