import { and, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "./db";
import type { LeadStage, OpportunityStatus } from "./db/schema";
import { scopeOf, type Permission, type SessionUser } from "./rbac";

const { opportunities, leads, quotes, policies, users, departments, kycRecords, roles, rolePermissions } = schema;

const NOTHING = sql`false`;

/** Row-level scope for opportunities. Applied to every query so a user never loads rows outside it. */
export function opportunityScope(user: SessionUser): SQL | undefined {
  switch (scopeOf(user, "opportunities")) {
    case "all":
      return undefined;
    case "department":
      return user.departmentId ? eq(opportunities.departmentId, user.departmentId) : NOTHING;
    case "own":
      return eq(opportunities.coordinatorId, user.id);
    default:
      return NOTHING;
  }
}

/** Row-level scope for leads, and through them quotes, KYC and policies. */
export function leadScope(user: SessionUser): SQL | undefined {
  switch (scopeOf(user, "leads")) {
    case "all":
      return undefined;
    case "department":
      return user.departmentId ? eq(leads.departmentId, user.departmentId) : NOTHING;
    case "own":
      return eq(leads.advisorId, user.id);
    default:
      return NOTHING;
  }
}

const coordinator = alias(users, "coordinator");
const advisor = alias(users, "advisor");

export async function listOpportunities(user: SessionUser, status?: OpportunityStatus) {
  return db
    .select({
      id: opportunities.id,
      customerName: opportunities.customerName,
      email: opportunities.email,
      product: opportunities.product,
      status: opportunities.status,
      source: opportunities.source,
      createdAt: opportunities.createdAt,
      coordinatorName: coordinator.name,
      departmentName: departments.name,
    })
    .from(opportunities)
    .innerJoin(departments, eq(opportunities.departmentId, departments.id))
    .leftJoin(coordinator, eq(opportunities.coordinatorId, coordinator.id))
    .where(and(opportunityScope(user), status ? eq(opportunities.status, status) : undefined))
    .orderBy(desc(opportunities.createdAt));
}

export async function getOpportunity(user: SessionUser, id: number) {
  const [row] = await db
    .select({
      opportunity: opportunities,
      departmentName: departments.name,
      coordinatorName: coordinator.name,
      leadId: leads.id,
    })
    .from(opportunities)
    .innerJoin(departments, eq(opportunities.departmentId, departments.id))
    .leftJoin(coordinator, eq(opportunities.coordinatorId, coordinator.id))
    .leftJoin(leads, and(eq(leads.opportunityId, opportunities.id), eq(leads.type, "new_business")))
    .where(and(eq(opportunities.id, id), opportunityScope(user)));
  return row ?? null;
}

export async function listLeads(user: SessionUser, stage?: LeadStage) {
  return db
    .select({
      id: leads.id,
      type: leads.type,
      stage: leads.stage,
      updatedAt: leads.updatedAt,
      customerName: opportunities.customerName,
      product: opportunities.product,
      advisorName: advisor.name,
      departmentName: departments.name,
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

export async function getLead(user: SessionUser, id: number) {
  const [row] = await db
    .select({
      lead: leads,
      opportunity: opportunities,
      departmentName: departments.name,
      advisorName: advisor.name,
    })
    .from(leads)
    .innerJoin(opportunities, eq(leads.opportunityId, opportunities.id))
    .innerJoin(departments, eq(leads.departmentId, departments.id))
    .leftJoin(advisor, eq(leads.advisorId, advisor.id))
    .where(and(eq(leads.id, id), leadScope(user)));
  return row ?? null;
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
      paymentStatus: policies.paymentStatus,
      renewedByLeadId: policies.renewedByLeadId,
      leadId: leads.id,
      customerName: opportunities.customerName,
      product: opportunities.product,
      insurer: quotes.insurer,
      coverage: quotes.coverage,
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

/** Active users in a department whose role grants a permission, e.g. advisors who can quote. */
export async function usersWithPermission(departmentId: number, permission: Permission) {
  return db
    .selectDistinct({ id: users.id, name: users.name, role: roles.name })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .where(and(eq(users.departmentId, departmentId), eq(users.active, true), eq(rolePermissions.permission, permission)))
    .orderBy(users.name);
}

export async function kycQueue(statuses: ("submitted" | "approved" | "rejected")[]) {
  return db
    .select({
      kyc: kycRecords,
      leadId: leads.id,
      customerName: opportunities.customerName,
      product: opportunities.product,
      departmentName: departments.name,
      advisorName: advisor.name,
    })
    .from(kycRecords)
    .innerJoin(leads, eq(kycRecords.leadId, leads.id))
    .innerJoin(opportunities, eq(leads.opportunityId, opportunities.id))
    .innerJoin(departments, eq(leads.departmentId, departments.id))
    .leftJoin(advisor, eq(leads.advisorId, advisor.id))
    .where(inArray(kycRecords.status, statuses))
    .orderBy(desc(kycRecords.submittedAt));
}

export async function dashboardStats(user: SessionUser) {
  const oScope = opportunityScope(user);
  const lScope = leadScope(user);

  const [oppsByStatus, leadsByStage, [policyTotals], [kycPending], renewals] = await Promise.all([
    db
      .select({ status: opportunities.status, count: sql<number>`count(*)::int` })
      .from(opportunities)
      .where(oScope)
      .groupBy(opportunities.status),
    db.select({ stage: leads.stage, count: sql<number>`count(*)::int` }).from(leads).where(lScope).groupBy(leads.stage),
    db
      .select({ active: sql<number>`count(*)::int`, premium: sql<number>`coalesce(sum(${policies.premium}), 0)::int` })
      .from(policies)
      .innerJoin(leads, eq(policies.leadId, leads.id))
      .where(and(lScope, eq(policies.status, "active"))),
    db.select({ count: sql<number>`count(*)::int` }).from(kycRecords).where(eq(kycRecords.status, "submitted")),
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
          sql`${policies.endDate} between current_date and current_date + 45`,
        ),
      )
      .orderBy(policies.endDate)
      .limit(6),
  ]);

  return {
    oppsByStatus: Object.fromEntries(oppsByStatus.map((r) => [r.status, r.count])) as Partial<Record<OpportunityStatus, number>>,
    leadsByStage: Object.fromEntries(leadsByStage.map((r) => [r.stage, r.count])) as Partial<Record<LeadStage, number>>,
    activePolicies: policyTotals.active,
    premium: policyTotals.premium,
    kycPending: kycPending.count,
    renewals,
  };
}
