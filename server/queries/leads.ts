import { and, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { LeadStage } from "@/constants/statuses";
import type { SessionUser } from "@/lib/rbac";
import { db, schema } from "@/server/db";
import { leadScope } from "./scope";

const { opportunities, leads, users, departments, kycRecords } = schema;
const advisor = alias(users, "advisor");

export function listLeads(user: SessionUser, stage?: LeadStage) {
  return db
    .select({
      id: leads.id,
      type: leads.type,
      stage: leads.stage,
      updatedAt: leads.updatedAt,
      customerName: opportunities.customerName,
      product: opportunities.product,
      advisorName: advisor.name,
      departmentKey: departments.key,
      kycStatus: kycRecords.status,
    })
    .from(leads)
    .innerJoin(opportunities, eq(leads.opportunityId, opportunities.id))
    .innerJoin(departments, eq(leads.departmentId, departments.id))
    .leftJoin(advisor, eq(leads.advisorId, advisor.id))
    .leftJoin(kycRecords, eq(kycRecords.leadId, leads.id))
    .where(and(leadScope(user), stage ? eq(leads.stage, stage) : undefined))
    .orderBy(desc(leads.updatedAt));
}

/** One lead inside the user's scope, or null. */
export async function getLead(user: SessionUser, id: number) {
  const [row] = await db
    .select({ lead: leads, opportunity: opportunities, departmentKey: departments.key, advisorName: advisor.name })
    .from(leads)
    .innerJoin(opportunities, eq(leads.opportunityId, opportunities.id))
    .innerJoin(departments, eq(leads.departmentId, departments.id))
    .leftJoin(advisor, eq(leads.advisorId, advisor.id))
    .where(and(eq(leads.id, id), leadScope(user)));
  return row ?? null;
}
