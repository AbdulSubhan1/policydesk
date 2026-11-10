"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { PRODUCTS, type Product } from "@/lib/products";

const { insurers, plans } = schema;

export type FormState = { error?: string; ok?: boolean };

export async function createInsurer(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("plans:manage");
  const parsed = z
    .object({ name: z.string().trim().min(2, "Insurer name is too short"), contactEmail: z.union([z.literal(""), z.email("Enter a valid email")]) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [existing] = await db.select({ id: insurers.id }).from(insurers).where(eq(insurers.name, parsed.data.name));
  if (existing) return { error: "This insurer already exists" };

  const [insurer] = await db.insert(insurers).values(parsed.data).returning();
  await logAudit({ userId: user.id, action: "create", entity: "insurer", entityId: insurer.id, details: insurer.name });
  revalidatePath("/admin/plans");
  return { ok: true };
}

export async function toggleInsurer(formData: FormData) {
  const user = await requirePermission("plans:manage");
  const [insurer] = await db.select().from(insurers).where(eq(insurers.id, Number(formData.get("insurerId"))));
  if (!insurer) throw new Error("Insurer not found");

  await db.update(insurers).set({ active: !insurer.active }).where(eq(insurers.id, insurer.id));
  await logAudit({ userId: user.id, action: insurer.active ? "deactivate" : "activate", entity: "insurer", entityId: insurer.id, details: insurer.name });
  revalidatePath("/admin/plans");
}

const planSchema = z.object({
  insurerId: z.coerce.number().int(),
  product: z.enum(PRODUCTS as [Product, ...Product[]]),
  name: z.string().trim().min(2, "Plan name is too short"),
  cover: z.string().trim().min(2, "Cover type is required"),
  basePremium: z.coerce.number().int().positive("Base premium must be positive"),
  excess: z.coerce.number().int().min(0),
  benefits: z.string().default(""),
});

export async function createPlan(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("plans:manage");
  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const benefits = parsed.data.benefits
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);
  const [plan] = await db.insert(plans).values({ ...parsed.data, benefits }).returning();
  await logAudit({ userId: user.id, action: "create", entity: "plan", entityId: plan.id, details: `${plan.name} (${plan.cover})` });
  revalidatePath("/admin/plans");
  return { ok: true };
}

export async function updatePlan(formData: FormData) {
  const user = await requirePermission("plans:manage");
  const [plan] = await db.select().from(plans).where(eq(plans.id, Number(formData.get("planId"))));
  if (!plan) throw new Error("Plan not found");

  const intent = formData.get("intent");
  if (intent === "toggle") {
    await db.update(plans).set({ active: !plan.active }).where(eq(plans.id, plan.id));
    await logAudit({ userId: user.id, action: plan.active ? "deactivate" : "activate", entity: "plan", entityId: plan.id, details: plan.name });
  } else {
    const basePremium = z.coerce.number().int().positive().parse(formData.get("basePremium"));
    await db.update(plans).set({ basePremium }).where(eq(plans.id, plan.id));
    await logAudit({ userId: user.id, action: "price", entity: "plan", entityId: plan.id, details: `${plan.name}: ${plan.basePremium} → ${basePremium}` });
  }
  revalidatePath("/admin/plans");
}
