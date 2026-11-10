"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { amount, id, type ActionResult } from "@/schemas/common";
import { insurerSchema, planSchema, type InsurerInput, type PlanInput } from "@/schemas/plan";
import { logAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth";
import { db, schema } from "@/server/db";

const { insurers, plans } = schema;

export async function createInsurer(input: InsurerInput): Promise<ActionResult> {
  const user = await requirePermission("plans:manage");
  const parsed = insurerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const [existing] = await db
    .select({ id: insurers.id })
    .from(insurers)
    .where(sql`lower(${insurers.name}) = lower(${parsed.data.name})`);
  if (existing) return { ok: false, error: "errors.duplicateName" };

  const [insurer] = await db.insert(insurers).values(parsed.data).returning();
  await logAudit({ userId: user.id, action: "create", entity: "insurer", entityId: insurer.id, details: insurer.name });
  revalidatePath("/admin/plans");
  return { ok: true };
}

export async function toggleInsurer(formData: FormData) {
  const user = await requirePermission("plans:manage");
  const [insurer] = await db
    .select()
    .from(insurers)
    .where(eq(insurers.id, id.parse(formData.get("insurerId"))));
  if (!insurer) throw new Error("errors.notFound");

  await db.update(insurers).set({ active: !insurer.active }).where(eq(insurers.id, insurer.id));
  await logAudit({
    userId: user.id,
    action: insurer.active ? "deactivate" : "activate",
    entity: "insurer",
    entityId: insurer.id,
    details: insurer.name,
  });
  revalidatePath("/admin/plans");
}

export async function createPlan(input: PlanInput): Promise<ActionResult> {
  const user = await requirePermission("plans:manage");
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { nameEn, nameAr, benefits, ...rest } = parsed.data;

  const [plan] = await db
    .insert(plans)
    .values({
      ...rest,
      name: nameAr ? { en: nameEn, ar: nameAr } : { en: nameEn },
      benefits: benefits
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean),
    })
    .returning();
  await logAudit({ userId: user.id, action: "create", entity: "plan", entityId: plan.id, details: nameEn });
  revalidatePath("/admin/plans");
  return { ok: true };
}

export async function updatePlan(formData: FormData) {
  const user = await requirePermission("plans:manage");
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, id.parse(formData.get("planId"))));
  if (!plan) throw new Error("errors.notFound");

  if (formData.get("intent") === "toggle") {
    await db.update(plans).set({ active: !plan.active }).where(eq(plans.id, plan.id));
    await logAudit({
      userId: user.id,
      action: plan.active ? "deactivate" : "activate",
      entity: "plan",
      entityId: plan.id,
      details: plan.name.en,
    });
  } else {
    const basePremium = amount.parse(formData.get("basePremium"));
    await db.update(plans).set({ basePremium }).where(eq(plans.id, plan.id));
    await logAudit({
      userId: user.id,
      action: "price",
      entity: "plan",
      entityId: plan.id,
      details: `${plan.name.en}: ${plan.basePremium} → ${basePremium}`,
    });
  }
  revalidatePath("/admin/plans");
}
