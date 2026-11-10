import { and, eq, isNull, sql } from "drizzle-orm";
import { RENEWAL_WINDOW_DAYS } from "@/constants/config";
import type { LeadStage, OpportunityStatus } from "@/constants/statuses";
import type { SessionUser } from "@/lib/rbac";
import { db, schema } from "@/server/db";
import { leadScope, opportunityScope } from "./scope";

const { opportunities, leads, policies, kycRecords } = schema;

export async function dashboardStats(user: SessionUser) {
  const oScope = opportunityScope(user);
  const lScope = leadScope(user);

  const [oppsByStatus, leadsByStage, [policyTotals], [kycPending], renewals] = await Promise.all([
    db
      .select({ status: opportunities.status, count: sql<number>`count(*)::int` })
      .from(opportunities)
      .where(oScope)
      .groupBy(opportunities.status),
    db
      .select({ stage: leads.stage, count: sql<number>`count(*)::int` })
      .from(leads)
      .where(lScope)
      .groupBy(leads.stage),
    db
      .select({ active: sql<number>`count(*)::int`, premium: sql<number>`coalesce(sum(${policies.premium}), 0)::int` })
      .from(policies)
      .innerJoin(leads, eq(policies.leadId, leads.id))
      .where(and(lScope, eq(policies.status, "active"))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(kycRecords)
      .where(eq(kycRecords.status, "submitted")),
    db
      .select({
        id: policies.id,
        policyNumber: policies.policyNumber,
        endDate: policies.endDate,
        customerName: opportunities.customerName,
        leadId: leads.id,
      })
      .from(policies)
      .innerJoin(leads, eq(policies.leadId, leads.id))
      .innerJoin(opportunities, eq(leads.opportunityId, opportunities.id))
      .where(
        and(
          lScope,
          eq(policies.status, "active"),
          isNull(policies.renewedByLeadId),
          sql`${policies.endDate} between current_date and current_date + ${RENEWAL_WINDOW_DAYS}::int`,
        ),
      )
      .orderBy(policies.endDate)
      .limit(6),
  ]);

  return {
    oppsByStatus: Object.fromEntries(oppsByStatus.map((r) => [r.status, r.count])) as Partial<
      Record<OpportunityStatus, number>
    >,
    leadsByStage: Object.fromEntries(leadsByStage.map((r) => [r.stage, r.count])) as Partial<Record<LeadStage, number>>,
    activePolicies: policyTotals.active,
    premium: policyTotals.premium,
    kycPending: kycPending.count,
    renewals,
  };
}
