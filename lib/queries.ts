import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db, schema } from "./db";
import type { LeadStatus } from "./db/schema";
import { seesOnlyOwnLeads, type SessionUser } from "./rbac";

const { leads, quotes, policies, users } = schema;

/** Row-level scope: agents only see leads assigned to them. Applied to every lead, quote and policy query. */
export function leadScope(user: SessionUser): SQL | undefined {
  return seesOnlyOwnLeads(user) ? eq(leads.assignedTo, user.id) : undefined;
}

export async function listLeads(user: SessionUser, status?: LeadStatus) {
  return db
    .select({
      id: leads.id,
      customerName: leads.customerName,
      email: leads.email,
      product: leads.product,
      status: leads.status,
      source: leads.source,
      createdAt: leads.createdAt,
      assigneeName: users.name,
    })
    .from(leads)
    .leftJoin(users, eq(leads.assignedTo, users.id))
    .where(and(leadScope(user), status ? eq(leads.status, status) : undefined))
    .orderBy(desc(leads.createdAt));
}

export async function getLead(user: SessionUser, id: number) {
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, id), leadScope(user)));
  return lead ?? null;
}

export async function listPolicies(user: SessionUser) {
  return db
    .select({
      id: policies.id,
      policyNumber: policies.policyNumber,
      premium: policies.premium,
      startDate: policies.startDate,
      endDate: policies.endDate,
      status: policies.status,
      leadId: leads.id,
      customerName: leads.customerName,
      product: leads.product,
      insurer: quotes.insurer,
    })
    .from(policies)
    .innerJoin(leads, eq(policies.leadId, leads.id))
    .innerJoin(quotes, eq(policies.quoteId, quotes.id))
    .where(leadScope(user))
    .orderBy(policies.endDate);
}

export async function dashboardStats(user: SessionUser) {
  const scope = leadScope(user);

  const byStatus = await db
    .select({ status: leads.status, count: sql<number>`count(*)::int` })
    .from(leads)
    .where(scope)
    .groupBy(leads.status);

  const [policyTotals] = await db
    .select({
      active: sql<number>`count(*)::int`,
      premium: sql<number>`coalesce(sum(${policies.premium}), 0)::int`,
    })
    .from(policies)
    .innerJoin(leads, eq(policies.leadId, leads.id))
    .where(and(scope, eq(policies.status, "active")));

  const renewals = await db
    .select({
      id: policies.id,
      policyNumber: policies.policyNumber,
      endDate: policies.endDate,
      customerName: leads.customerName,
      leadId: leads.id,
    })
    .from(policies)
    .innerJoin(leads, eq(policies.leadId, leads.id))
    .where(
      and(
        scope,
        eq(policies.status, "active"),
        sql`${policies.endDate} between current_date and current_date + 30`,
      ),
    )
    .orderBy(policies.endDate)
    .limit(6);

  const recent = await listLeads(user);

  return {
    byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.count])) as Partial<Record<LeadStatus, number>>,
    activePolicies: policyTotals.active,
    premium: policyTotals.premium,
    renewals,
    recent: recent.slice(0, 6),
  };
}
