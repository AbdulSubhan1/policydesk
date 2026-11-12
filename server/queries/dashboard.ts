import { and, desc, eq, gte, isNull, lt, ne, notExists, notInArray, sql, type Column, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { CLOSED_LEAD_STAGES, type LeadStage } from "@/constants/statuses";
import type { PeriodRange } from "@/lib/dashboard";
import type { SessionUser } from "@/lib/rbac";
import { db, schema } from "@/server/db";
import { renewalDue } from "./policies";
import { leadScope, opportunityScope } from "./scope";

const { opportunities, leads, policies, quotes, kycRecords, orders, users } = schema;
const advisor = alias(users, "advisor");

/** Rows that match `condition`, counted inside one aggregate query. */
const tally = (condition: SQL | undefined) => sql<number>`count(*) filter (where ${condition})::int`;
const premiumWhere = (condition: SQL | undefined) =>
  sql<number>`coalesce(sum(${policies.premium}) filter (where ${condition}), 0)::int`;
const between = (column: Column, from: Date, to: Date) => and(gte(column, from), lt(column, to));

/**
 * Everything the dashboard shows, in the user's scope: the "Needs you today" counts, the period's numbers, the lead
 * pipeline, where opportunities came from and the next renewals. Each block is one aggregate query.
 */
export async function dashboardStats(user: SessionUser, range: PeriodRange, now = new Date()) {
  const lScope = leadScope(user);
  const open = notInArray(leads.stage, [...CLOSED_LEAD_STAGES]);
  const toRecord = and(eq(policies.status, "booked"), eq(policies.paymentStatus, "pending"));
  const written = ne(policies.status, "cancelled");

  const [[leadTotals], byStage, [kyc], [policyTotals], [paidToBook], bySource, renewals] = await Promise.all([
    db
      .select({
        open: tally(open),
        newInPeriod: tally(between(leads.createdAt, range.start, now)),
        // Leads have no closing date; a closed lead is not edited again, so its last update is when it closed
        wonInPeriod: tally(and(eq(leads.stage, "won"), between(leads.updatedAt, range.start, now))),
        lostInPeriod: tally(and(eq(leads.stage, "lost"), between(leads.updatedAt, range.start, now))),
        unassigned: tally(and(open, isNull(leads.advisorId))),
        toQuote: tally(eq(leads.stage, "needs_analysis")),
        kycToSend: tally(
          and(eq(leads.stage, "kyc"), sql`coalesce(${kycRecords.status}, 'pending') in ('pending', 'rejected')`),
        ),
      })
      .from(leads)
      .leftJoin(kycRecords, eq(kycRecords.leadId, leads.id))
      .where(lScope),
    db
      .select({ stage: leads.stage, count: sql<number>`count(*)::int` })
      .from(leads)
      .where(lScope)
      .groupBy(leads.stage),
    // Compliance reviews every department's checks, as on the KYC review page
    db
      .select({
        waiting: sql<number>`count(*)::int`,
        oldest: sql<Date | null>`min(${kycRecords.submittedAt})`.mapWith(kycRecords.submittedAt),
      })
      .from(kycRecords)
      .where(eq(kycRecords.status, "submitted")),
    db
      .select({
        active: tally(eq(policies.status, "active")),
        toRecord: tally(toRecord),
        toRecordAmount: premiumWhere(toRecord),
        renewalsDue: tally(renewalDue),
        written: premiumWhere(and(written, between(policies.createdAt, range.start, now))),
        writtenBefore: premiumWhere(and(written, between(policies.createdAt, range.previousStart, range.previousEnd))),
      })
      .from(policies)
      .innerJoin(leads, eq(policies.leadId, leads.id))
      .where(lScope),
    // Paid on the website but no policy booked yet: the advisor's next step
    db
      .select({ count: sql<number>`count(*)::int`, amount: sql<number>`coalesce(sum(${orders.amount}), 0)::int` })
      .from(orders)
      .innerJoin(leads, eq(orders.leadId, leads.id))
      .where(
        and(
          lScope,
          eq(orders.status, "paid"),
          notExists(db.select({ id: policies.id }).from(policies).where(eq(policies.leadId, leads.id))),
        ),
      ),
    db
      .select({
        source: opportunities.source,
        count: sql<number>`count(*)::int`,
        converted: tally(eq(opportunities.status, "converted")),
      })
      .from(opportunities)
      .where(and(opportunityScope(user), between(opportunities.createdAt, range.start, now)))
      .groupBy(opportunities.source)
      .orderBy(desc(sql`count(*)`), opportunities.source),
    db
      .select({
        id: policies.id,
        policyNumber: policies.policyNumber,
        endDate: policies.endDate,
        premium: policies.premium,
        insurer: quotes.insurer,
        customerName: opportunities.customerName,
        leadPublicId: leads.publicId,
        advisorName: advisor.name,
      })
      .from(policies)
      .innerJoin(leads, eq(policies.leadId, leads.id))
      .innerJoin(opportunities, eq(leads.opportunityId, opportunities.id))
      .innerJoin(quotes, eq(policies.quoteId, quotes.id))
      .leftJoin(advisor, eq(leads.advisorId, advisor.id))
      .where(and(lScope, renewalDue, sql`${policies.endDate} >= current_date`))
      .orderBy(policies.endDate, policies.id)
      .limit(8),
  ]);

  return {
    leads: leadTotals,
    leadsByStage: Object.fromEntries(byStage.map((r) => [r.stage, r.count])) as Partial<Record<LeadStage, number>>,
    kyc,
    policies: policyTotals,
    paidToBook,
    sources: bySource,
    renewals,
  };
}
