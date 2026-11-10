import { and, count, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { RENEWAL_WINDOW_DAYS } from "@/constants/config";
import type { Page } from "@/lib/pagination";
import type { SessionUser } from "@/lib/rbac";
import { db, schema } from "@/server/db";
import { leadScope } from "./scope";

const { opportunities, leads, quotes, policies, users } = schema;
const advisor = alias(users, "advisor");
const renewalLead = alias(leads, "renewal_lead");

export type PolicyFilter = "booked" | "active" | "cancelled" | "unpaid" | "renewal_due";

/** Due for renewal: active, not yet renewed, and ending within the renewal window. */
export const renewalDue = and(
  eq(policies.status, "active"),
  isNull(policies.renewedByLeadId),
  sql`${policies.endDate} <= current_date + ${RENEWAL_WINDOW_DAYS}::int`,
);

function filterWhere(filter?: PolicyFilter): SQL | undefined {
  if (filter === "unpaid") return inArray(policies.paymentStatus, ["pending", "failed"]);
  if (filter === "renewal_due") return renewalDue;
  return filter ? eq(policies.status, filter) : undefined;
}

/** One page of policies in the user's scope, soonest to end first, with the total for pagination. */
export async function listPolicies(
  user: SessionUser,
  { filter, q, page }: { filter?: PolicyFilter; q?: string; page: Page },
) {
  const where: SQL | undefined = and(
    leadScope(user),
    filterWhere(filter),
    q
      ? or(
          ilike(opportunities.customerName, `%${q}%`),
          ilike(policies.policyNumber, `%${q}%`),
          ilike(leads.reference, `%${q}%`),
        )
      : undefined,
  );
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: policies.id,
        policyNumber: policies.policyNumber,
        premium: policies.premium,
        startDate: policies.startDate,
        endDate: policies.endDate,
        status: policies.status,
        paymentStatus: policies.paymentStatus,
        renewalPublicId: renewalLead.publicId,
        leadPublicId: leads.publicId,
        reference: leads.reference,
        customerName: opportunities.customerName,
        product: opportunities.product,
        insurer: quotes.insurer,
        planName: quotes.planName,
        cover: quotes.cover,
        advisorName: advisor.name,
        renewalDue: sql<boolean>`${renewalDue}`,
      })
      .from(policies)
      .innerJoin(leads, eq(policies.leadId, leads.id))
      .innerJoin(opportunities, eq(leads.opportunityId, opportunities.id))
      .innerJoin(quotes, eq(policies.quoteId, quotes.id))
      .leftJoin(advisor, eq(leads.advisorId, advisor.id))
      .leftJoin(renewalLead, eq(policies.renewedByLeadId, renewalLead.id))
      .where(where)
      .orderBy(policies.endDate, policies.id)
      .limit(page.limit)
      .offset(page.offset),
    db
      .select({ total: count() })
      .from(policies)
      .innerJoin(leads, eq(policies.leadId, leads.id))
      .innerJoin(opportunities, eq(leads.opportunityId, opportunities.id))
      .where(where),
  ]);
  return { rows, total };
}
