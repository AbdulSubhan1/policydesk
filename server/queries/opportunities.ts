import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { OpportunityStatus } from "@/constants/statuses";
import type { Page } from "@/lib/pagination";
import type { SessionUser } from "@/lib/rbac";
import { db, schema } from "@/server/db";
import { opportunityScope } from "./scope";

const { opportunities, leads, users, departments } = schema;
const coordinator = alias(users, "coordinator");

/** One page of opportunities in the user's scope, the total for pagination and the count of each status for the tabs. */
export async function listOpportunities(
  user: SessionUser,
  { status, q, page }: { status?: OpportunityStatus; q?: string; page: Page },
) {
  const base: SQL | undefined = and(
    opportunityScope(user),
    q ? or(ilike(opportunities.customerName, `%${q}%`), ilike(opportunities.email, `%${q}%`)) : undefined,
  );
  const [rows, byStatus] = await Promise.all([
    db
      .select({
        id: opportunities.id,
        customerName: opportunities.customerName,
        email: opportunities.email,
        product: opportunities.product,
        status: opportunities.status,
        source: opportunities.source,
        createdAt: opportunities.createdAt,
        coordinatorName: coordinator.name,
        departmentKey: departments.key,
      })
      .from(opportunities)
      .innerJoin(departments, eq(opportunities.departmentId, departments.id))
      .leftJoin(coordinator, eq(opportunities.coordinatorId, coordinator.id))
      .where(and(base, status ? eq(opportunities.status, status) : undefined))
      .orderBy(desc(opportunities.createdAt), desc(opportunities.id))
      .limit(page.limit)
      .offset(page.offset),
    db
      .select({ status: opportunities.status, count: count() })
      .from(opportunities)
      .where(base)
      .groupBy(opportunities.status),
  ]);
  const statusCounts = Object.fromEntries(byStatus.map((r) => [r.status, r.count])) as Partial<
    Record<OpportunityStatus, number>
  >;
  const all = byStatus.reduce((sum, r) => sum + r.count, 0);
  return { rows, total: status ? (statusCounts[status] ?? 0) : all, all, statusCounts };
}

/** One opportunity inside the user's scope, or null. */
export async function getOpportunity(user: SessionUser, id: number) {
  const [row] = await db
    .select({
      opportunity: opportunities,
      departmentKey: departments.key,
      coordinatorName: coordinator.name,
      leadId: leads.id,
      leadPublicId: leads.publicId,
      leadReference: leads.reference,
    })
    .from(opportunities)
    .innerJoin(departments, eq(opportunities.departmentId, departments.id))
    .leftJoin(coordinator, eq(opportunities.coordinatorId, coordinator.id))
    .leftJoin(leads, and(eq(leads.opportunityId, opportunities.id), eq(leads.type, "new_business")))
    .where(and(eq(opportunities.id, id), opportunityScope(user)));
  return row ?? null;
}
