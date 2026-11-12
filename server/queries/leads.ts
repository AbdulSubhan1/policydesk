import { and, count, desc, eq, exists, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { DepartmentKey } from "@/constants/products";
import type { LeadStage } from "@/constants/statuses";
import type { Page } from "@/lib/pagination";
import { scopeOf, type SessionUser } from "@/lib/rbac";
import { db, schema } from "@/server/db";
import { leadScope } from "./scope";

const { opportunities, leads, users, departments, kycRecords, orders, quotes, rolePermissions } = schema;
const advisor = alias(users, "advisor");

export type LeadFilters = {
  stage?: LeadStage;
  q?: string;
  /** An advisor's user id, or "none" for leads nobody works yet. */
  advisor?: string;
  department?: DepartmentKey;
  /** Only leads with a paid website order. */
  paidOnline?: boolean;
};

// In the same query, so the list does not look up orders lead by lead
const paidOnline = exists(
  db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.leadId, leads.id), eq(orders.status, "paid"))),
);

/**
 * The premium the lead is about: the plan the customer picked online, else the accepted quote, else the newest open
 * one. Rejected quotes count only when nothing else is left (a lost lead still shows what it was worth).
 */
const currentPremium = sql<number | null>`(
  select ${quotes.premium} from ${quotes} where ${quotes.leadId} = ${leads.id}
  order by ${quotes.online} desc, (${quotes.status} = 'accepted') desc, (${quotes.status} <> 'rejected') desc, ${quotes.id} desc
  limit 1
)`;

/** One page of leads in the user's scope, the total for pagination and the count of each stage for the tabs. */
export async function listLeads(user: SessionUser, { page, ...filters }: LeadFilters & { page: Page }) {
  const { stage, q, advisor: advisorId, department, paidOnline: paidOnly } = filters;
  // Everything but the stage, so each tab can show how many leads it holds under the other filters
  const base: SQL | undefined = and(
    leadScope(user),
    q ? or(ilike(opportunities.customerName, `%${q}%`), ilike(leads.reference, `%${q.trim()}%`)) : undefined,
    advisorId === "none"
      ? isNull(leads.advisorId)
      : Number(advisorId) > 0
        ? eq(leads.advisorId, Number(advisorId))
        : undefined,
    department ? eq(departments.key, department) : undefined,
    paidOnly ? paidOnline : undefined,
  );
  const where = and(base, stage ? eq(leads.stage, stage) : undefined);

  const [rows, byStage] = await Promise.all([
    db
      .select({
        id: leads.id,
        publicId: leads.publicId,
        reference: leads.reference,
        type: leads.type,
        stage: leads.stage,
        updatedAt: leads.updatedAt,
        customerName: opportunities.customerName,
        product: opportunities.product,
        advisorName: advisor.name,
        departmentKey: departments.key,
        kycStatus: kycRecords.status,
        paidOnline: paidOnline.mapWith(Boolean),
        premium: currentPremium,
      })
      .from(leads)
      .innerJoin(opportunities, eq(leads.opportunityId, opportunities.id))
      .innerJoin(departments, eq(leads.departmentId, departments.id))
      .leftJoin(advisor, eq(leads.advisorId, advisor.id))
      .leftJoin(kycRecords, eq(kycRecords.leadId, leads.id))
      .where(where)
      .orderBy(desc(leads.updatedAt), desc(leads.id))
      .limit(page.limit)
      .offset(page.offset),
    db
      .select({ stage: leads.stage, count: count() })
      .from(leads)
      .innerJoin(opportunities, eq(leads.opportunityId, opportunities.id))
      .innerJoin(departments, eq(leads.departmentId, departments.id))
      .where(base)
      .groupBy(leads.stage),
  ]);
  const stageCounts = Object.fromEntries(byStage.map((r) => [r.stage, r.count])) as Partial<Record<LeadStage, number>>;
  const all = byStage.reduce((sum, r) => sum + r.count, 0);
  return { rows, total: stage ? (stageCounts[stage] ?? 0) : all, all, stageCounts };
}

/** People who work leads in the user's scope, for the Advisor filter. */
export async function leadAdvisors(user: SessionUser) {
  return db
    .selectDistinct({ id: advisor.id, name: advisor.name })
    .from(leads)
    .innerJoin(advisor, eq(leads.advisorId, advisor.id))
    .where(leadScope(user))
    .orderBy(advisor.name);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One lead inside the user's scope, or null. Pages pass the public UUID from the URL; actions pass the id. */
export async function getLead(user: SessionUser, key: number | string) {
  if (typeof key === "string" && !UUID.test(key)) return null;
  const [row] = await db
    .select({ lead: leads, opportunity: opportunities, departmentKey: departments.key, advisorName: advisor.name })
    .from(leads)
    .innerJoin(opportunities, eq(leads.opportunityId, opportunities.id))
    .innerJoin(departments, eq(leads.departmentId, departments.id))
    .leftJoin(advisor, eq(leads.advisorId, advisor.id))
    .where(and(typeof key === "string" ? eq(leads.publicId, key) : eq(leads.id, key), leadScope(user)));
  return row ?? null;
}

/** Advisors the user may hand leads to (bulk Assign on the leads list), with their department. */
export async function assignableAdvisors(user: SessionUser) {
  const scope = scopeOf(user, "leads");
  if (scope === "none" || scope === "own") return [];
  return db
    .selectDistinct({ id: users.id, name: users.name, departmentKey: departments.key })
    .from(users)
    .innerJoin(departments, eq(users.departmentId, departments.id))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, users.roleId))
    .where(
      and(
        eq(users.active, true),
        eq(rolePermissions.permission, "quotes:create"),
        scope === "department" ? eq(users.departmentId, user.departmentId ?? 0) : undefined,
      ),
    )
    .orderBy(departments.key, users.name);
}
