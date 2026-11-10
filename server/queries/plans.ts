import { eq, sql } from "drizzle-orm";
import type { Product } from "@/constants/products";
import { db, schema } from "@/server/db";

const { insurers, plans } = schema;

export function listInsurers() {
  return db
    .select({
      id: insurers.id,
      name: insurers.name,
      contactEmail: insurers.contactEmail,
      active: insurers.active,
      planCount: sql<number>`(select count(*)::int from ${plans} where ${plans.insurerId} = ${insurers.id})`,
    })
    .from(insurers)
    .orderBy(insurers.name);
}

/** Every plan of a product, active or not, with its insurer. */
export function listPlans(product: Product) {
  return db
    .select({ plan: plans, insurerName: insurers.name, insurerActive: insurers.active })
    .from(plans)
    .innerJoin(insurers, eq(plans.insurerId, insurers.id))
    .where(eq(plans.product, product))
    .orderBy(insurers.name, plans.basePremium);
}
