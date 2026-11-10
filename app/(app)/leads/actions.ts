"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { LEAD_STATUSES, PRODUCTS } from "@/lib/db/schema";
import { getLead } from "@/lib/queries";
import { can } from "@/lib/rbac";

const { leads, quotes, policies, users } = schema;

export type FormState = { error?: string };

const leadSchema = z.object({
  customerName: z.string().trim().min(2, "Name is too short"),
  email: z.email("Enter a valid email"),
  phone: z.string().trim().min(6, "Enter a valid phone number"),
  product: z.enum(PRODUCTS),
  source: z.string().trim().min(1),
  notes: z.string().trim().max(1000).default(""),
});

export async function createLead(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("leads:create");
  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Someone who cannot assign leads (an agent) owns what they create, otherwise they could not see it
  const assignedTo = can(user, "leads:assign") ? null : user.id;
  const [lead] = await db.insert(leads).values({ ...parsed.data, assignedTo }).returning();
  await logAudit({ userId: user.id, action: "create", entity: "lead", entityId: lead.id, details: lead.customerName });
  redirect(`/leads/${lead.id}`);
}

/** Loads a lead the user may act on. Agents get null for leads that are not theirs. */
async function scopedLead(permission: Parameters<typeof requirePermission>[0], leadId: number) {
  const user = await requirePermission(permission);
  const lead = await getLead(user, leadId);
  if (!lead) throw new Error("Lead not found");
  return { user, lead };
}

export async function updateLeadStatus(formData: FormData) {
  const leadId = Number(formData.get("leadId"));
  const status = z.enum(LEAD_STATUSES).parse(formData.get("status"));
  const { user, lead } = await scopedLead("leads:edit", leadId);

  await db.update(leads).set({ status, updatedAt: new Date() }).where(eq(leads.id, lead.id));
  await logAudit({ userId: user.id, action: "status", entity: "lead", entityId: lead.id, details: `${lead.status} → ${status}` });
  revalidatePath(`/leads/${lead.id}`);
}

export async function assignLead(formData: FormData) {
  const leadId = Number(formData.get("leadId"));
  const raw = String(formData.get("assignedTo") ?? "");
  const { user, lead } = await scopedLead("leads:assign", leadId);

  let assignee: { id: number; name: string } | null = null;
  if (raw) {
    [assignee] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.id, Number(raw)), eq(users.active, true)));
    if (!assignee) throw new Error("User not found");
  }

  await db.update(leads).set({ assignedTo: assignee?.id ?? null, updatedAt: new Date() }).where(eq(leads.id, lead.id));
  await logAudit({ userId: user.id, action: "assign", entity: "lead", entityId: lead.id, details: assignee?.name ?? "Unassigned" });
  revalidatePath(`/leads/${lead.id}`);
}

const quoteSchema = z.object({
  insurer: z.string().trim().min(2, "Insurer is required"),
  premium: z.coerce.number().int("Whole numbers only").positive("Premium must be positive"),
  coverage: z.string().trim().min(1),
});

export async function createQuote(_prev: FormState, formData: FormData): Promise<FormState> {
  const leadId = Number(formData.get("leadId"));
  const { user, lead } = await scopedLead("quotes:create", leadId);
  const parsed = quoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [quote] = await db.insert(quotes).values({ ...parsed.data, leadId: lead.id, status: "sent", createdBy: user.id }).returning();
  if (lead.status === "new" || lead.status === "contacted") {
    await db.update(leads).set({ status: "quoted", updatedAt: new Date() }).where(eq(leads.id, lead.id));
  }
  await logAudit({ userId: user.id, action: "create", entity: "quote", entityId: quote.id, details: `${quote.insurer} for lead #${lead.id}` });
  revalidatePath(`/leads/${lead.id}`);
  return {};
}

export async function setQuoteStatus(formData: FormData) {
  const quoteId = Number(formData.get("quoteId"));
  const status = z.enum(["accepted", "rejected"]).parse(formData.get("status"));
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
  if (!quote) throw new Error("Quote not found");
  const { user, lead } = await scopedLead("quotes:approve", quote.leadId);

  await db.update(quotes).set({ status }).where(eq(quotes.id, quote.id));
  await logAudit({ userId: user.id, action: status, entity: "quote", entityId: quote.id, details: quote.insurer });
  revalidatePath(`/leads/${lead.id}`);
}

export async function issuePolicy(formData: FormData) {
  const quoteId = Number(formData.get("quoteId"));
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
  if (!quote || quote.status !== "accepted") throw new Error("Only accepted quotes can become policies");
  const { user, lead } = await scopedLead("policies:issue", quote.leadId);

  const [existing] = await db.select({ id: policies.id }).from(policies).where(eq(policies.quoteId, quote.id));
  if (existing) throw new Error("A policy was already issued for this quote");

  const start = new Date();
  const end = new Date(start.getTime() + 365 * 86_400_000);
  const [policy] = await db
    .insert(policies)
    .values({
      policyNumber: `PD-${start.getFullYear()}-${String(lead.id).padStart(5, "0")}-${quote.id}`,
      leadId: lead.id,
      quoteId: quote.id,
      premium: quote.premium,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    })
    .returning();
  await db.update(leads).set({ status: "won", updatedAt: new Date() }).where(eq(leads.id, lead.id));
  await logAudit({ userId: user.id, action: "issue", entity: "policy", entityId: policy.id, details: policy.policyNumber });
  revalidatePath(`/leads/${lead.id}`);
}
