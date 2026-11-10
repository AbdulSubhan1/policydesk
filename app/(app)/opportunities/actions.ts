"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { departmentForProduct, PRODUCTS, type Product } from "@/lib/products";
import { getOpportunity, usersWithPermission } from "@/lib/queries";
import { can, type Permission } from "@/lib/rbac";

const { opportunities, leads, kycRecords, departments } = schema;

export type FormState = { error?: string };

const opportunitySchema = z.object({
  customerName: z.string().trim().min(2, "Name is too short"),
  email: z.email("Enter a valid email"),
  phone: z.string().trim().min(6, "Enter a valid phone number"),
  product: z.enum(PRODUCTS as [Product, ...Product[]]),
  source: z.string().trim().min(1),
  notes: z.string().trim().max(1000).default(""),
});

export async function createOpportunity(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("opportunities:create");
  const parsed = opportunitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Every product belongs to exactly one department, which decides who can see the opportunity
  const [dept] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.name, departmentForProduct(parsed.data.product)));
  // A coordinator creating one in their own department owns it straight away
  const coordinatorId = can(user, "opportunities:convert") && user.departmentId === dept.id ? user.id : null;

  const [opp] = await db.insert(opportunities).values({ ...parsed.data, departmentId: dept.id, coordinatorId }).returning();
  await logAudit({ userId: user.id, action: "create", entity: "opportunity", entityId: opp.id, details: opp.customerName });
  redirect(`/opportunities/${opp.id}`);
}

async function scopedOpportunity(permission: Permission, id: number) {
  const user = await requirePermission(permission);
  const row = await getOpportunity(user, id);
  if (!row) throw new Error("Opportunity not found");
  return { user, opp: row.opportunity };
}

export async function updateOpportunityStatus(formData: FormData) {
  const status = z.enum(["new", "contacted", "qualified", "disqualified"]).parse(formData.get("status"));
  const { user, opp } = await scopedOpportunity("opportunities:edit", Number(formData.get("id")));
  if (opp.status === "converted") throw new Error("Converted opportunities cannot change status");

  await db.update(opportunities).set({ status, updatedAt: new Date() }).where(eq(opportunities.id, opp.id));
  await logAudit({ userId: user.id, action: "status", entity: "opportunity", entityId: opp.id, details: `${opp.status} → ${status}` });
  revalidatePath(`/opportunities/${opp.id}`);
}

export async function assignCoordinator(formData: FormData) {
  const { user, opp } = await scopedOpportunity("opportunities:assign", Number(formData.get("id")));
  const raw = String(formData.get("coordinatorId") ?? "");
  const coordinators = await usersWithPermission(opp.departmentId, "opportunities:convert");
  const coordinator = raw ? coordinators.find((c) => c.id === Number(raw)) : null;
  if (raw && !coordinator) throw new Error("Pick a coordinator from this department");

  await db.update(opportunities).set({ coordinatorId: coordinator?.id ?? null, updatedAt: new Date() }).where(eq(opportunities.id, opp.id));
  await logAudit({ userId: user.id, action: "assign", entity: "opportunity", entityId: opp.id, details: coordinator?.name ?? "Unassigned" });
  revalidatePath(`/opportunities/${opp.id}`);
}

export async function convertToLead(formData: FormData) {
  const { user, opp } = await scopedOpportunity("opportunities:convert", Number(formData.get("id")));
  if (opp.status !== "qualified") throw new Error("Only qualified opportunities can be converted");

  const advisors = await usersWithPermission(opp.departmentId, "quotes:create");
  const advisor = advisors.find((a) => a.id === Number(formData.get("advisorId")));
  if (!advisor) throw new Error("Pick an advisor from this department");

  const [lead] = await db.insert(leads).values({ opportunityId: opp.id, departmentId: opp.departmentId, advisorId: advisor.id }).returning();
  await db.insert(kycRecords).values({ leadId: lead.id });
  await db.update(opportunities).set({ status: "converted", updatedAt: new Date() }).where(eq(opportunities.id, opp.id));
  await logAudit({ userId: user.id, action: "convert", entity: "opportunity", entityId: opp.id, leadId: lead.id, details: `Assigned to ${advisor.name}` });
  redirect(`/leads/${lead.id}`);
}
