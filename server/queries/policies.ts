import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { SessionUser } from "@/lib/rbac";
import { db, schema } from "@/server/db";
import { leadScope } from "./scope";

const { opportunities, leads, quotes, policies, users } = schema;
const advisor = alias(users, "advisor");

export async function listPolicies(user: SessionUser) {
  return db
    .select({
      id: policies.id,
      policyNumber: policies.policyNumber,
      premium: policies.premium,
      startDate: policies.startDate,
      endDate: policies.endDate,
      status: policies.status,
      paymentStatus: policies.paymentStatus,
      renewedByLeadId: policies.renewedByLeadId,
      leadId: leads.id,
      customerName: opportunities.customerName,
      product: opportunities.product,
      insurer: quotes.insurer,
      planName: quotes.planName,
      cover: quotes.cover,
      advisorName: advisor.name,
    })
    .from(policies)
    .innerJoin(leads, eq(policies.leadId, leads.id))
    .innerJoin(opportunities, eq(leads.opportunityId, opportunities.id))
    .innerJoin(quotes, eq(policies.quoteId, quotes.id))
    .leftJoin(advisor, eq(leads.advisorId, advisor.id))
    .where(leadScope(user))
    .orderBy(policies.endDate);
}
