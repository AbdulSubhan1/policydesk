import { and, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { OpportunityStatus } from "@/constants/statuses";
import type { SessionUser } from "@/lib/rbac";
import { db, schema } from "@/server/db";
import { opportunityScope } from "./scope";

const { opportunities, leads, users, departments } = schema;
const coordinator = alias(users, "coordinator");

export function listOpportunities(user: SessionUser, status?: OpportunityStatus) {
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
      departmentKey: departments.key,
    })
    .from(opportunities)
    .innerJoin(departments, eq(opportunities.departmentId, departments.id))
    .leftJoin(coordinator, eq(opportunities.coordinatorId, coordinator.id))
    .where(and(opportunityScope(user), status ? eq(opportunities.status, status) : undefined))
    .orderBy(desc(opportunities.createdAt));
}

/** One opportunity inside the user's scope, or null. */
export async function getOpportunity(user: SessionUser, id: number) {
  const [row] = await db
    .select({
      opportunity: opportunities,
      departmentKey: departments.key,
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
