import { and, count, desc, eq, exists, ilike, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { LeadStage } from "@/constants/statuses";
import type { Page } from "@/lib/pagination";
import type { SessionUser } from "@/lib/rbac";
import { db, schema } from "@/server/db";
import { leadScope } from "./scope";

const { opportunities, leads, users, departments, kycRecords, orders } = schema;
const advisor = alias(users, "advisor");

/** One page of leads in the user's scope, with the total for pagination. */
export async function listLeads(user: SessionUser, { stage, q, page }: { stage?: LeadStage; q?: string; page: Page }) {
  const where: SQL | undefined = and(
    leadScope(user),
    stage ? eq(leads.stage, stage) : undefined,
    q ? or(ilike(opportunities.customerName, `%${q}%`), ilike(leads.reference, `%${q.trim()}%`)) : undefined,
  );
  const [rows, [{ total }]] = await Promise.all([
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
        // In the same query, so the list does not look up orders lead by lead
        paidOnline: exists(
          db
            .select({ id: orders.id })
            .from(orders)
            .where(and(eq(orders.leadId, leads.id), eq(orders.status, "paid"))),
        ).mapWith(Boolean),
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
      .select({ total: count() })
      .from(leads)
      .innerJoin(opportunities, eq(leads.opportunityId, opportunities.id))
      .where(where),
  ]);
  return { rows, total };
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
