import { eq } from "drizzle-orm";
import type { Permission } from "@/lib/rbac";
import { requirePermission } from "@/server/auth";
import { db, schema } from "@/server/db";
import { getLead } from "@/server/queries/leads";
import { getOpportunity } from "@/server/queries/opportunities";

// Guards for server actions: check the permission, then load the record only if it is inside the user's scope.

export async function requireOpportunity(permission: Permission, opportunityId: number) {
  const user = await requirePermission(permission);
  const row = await getOpportunity(user, opportunityId);
  if (!row) throw new Error("errors.notFound");
  return { user, ...row };
}

export async function requireLead(permission: Permission, leadId: number) {
  const user = await requirePermission(permission);
  const row = await getLead(user, leadId);
  if (!row) throw new Error("errors.notFound");
  return { user, ...row };
}

export async function requireQuote(permission: Permission, quoteId: number) {
  const [quote] = await db.select().from(schema.quotes).where(eq(schema.quotes.id, quoteId));
  if (!quote) throw new Error("errors.notFound");
  return { quote, ...(await requireLead(permission, quote.leadId)) };
}

export async function requirePolicy(permission: Permission, policyId: number) {
  const [policy] = await db.select().from(schema.policies).where(eq(schema.policies.id, policyId));
  if (!policy) throw new Error("errors.notFound");
  return { policy, ...(await requireLead(permission, policy.leadId)) };
}
