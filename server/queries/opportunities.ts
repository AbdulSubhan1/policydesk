import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { OpportunityStatus } from "@/constants/statuses";
import type { Page } from "@/lib/pagination";
import type { SessionUser } from "@/lib/rbac";
import { db, schema } from "@/server/db";
import { opportunityScope } from "./scope";

const { opportunities, leads, users, departments } = schema;
const coordinator = alias(users, "coordinator");

/** One page of opportunities in the user's scope, with the total for pagination. */
export async function listOpportunities(
  user: SessionUser,
  { status, q, page }: { status?: OpportunityStatus; q?: string; page: Page },
) {
  const where: SQL | undefined = and(
    opportunityScope(user),
    status ? eq(opportunities.status, status) : undefined,
    q ? or(ilike(opportunities.customerName, `%${q}%`), ilike(opportunities.email, `%${q}%`)) : undefined,
  );
  const [rows, [{ total }]] = await Promise.all([
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
      .where(where)
      .orderBy(desc(opportunities.createdAt), desc(opportunities.id))
      .limit(page.limit)
      .offset(page.offset),
    db.select({ total: count() }).from(opportunities).where(where),
  ]);
  return { rows, total };
}

/** One opportunity inside the user's scope, or null. */
export async function getOpportunity(user: SessionUser, id: number) {
  const [row] = await db
    .select({
      opportunity: opportunities,
      departmentKey: departments.key,
      coordinatorName: coordinator.name,
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
