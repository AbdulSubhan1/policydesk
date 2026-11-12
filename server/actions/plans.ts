"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { WEBSITE_ADD_ONS } from "@/constants/add-ons";
import type { Localized } from "@/constants/i18n";
import { isWebsiteProduct } from "@/constants/website";
import type { ActionResult } from "@/schemas/action-result";
import { id } from "@/schemas/fields";
import {
  insurerSchema,
  planEditSchema,
  planSchema,
  type InsurerInput,
  type PlanEditInput,
  type PlanInput,
} from "@/schemas/plan";
import { logAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth";
import { assertNotDemoLocked, demoLockError } from "@/server/demo-lock";
import { db, schema } from "@/server/db";

const { insurers, plans, planAddOns } = schema;

export async function createInsurer(input: InsurerInput): Promise<ActionResult> {
  const user = await requirePermission("plans:manage");
  const locked = await demoLockError("catalogue", user.email, "/admin/plans");
  if (locked) return { ok: false, error: locked };
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
  await assertNotDemoLocked("catalogue", user.email, "/admin/plans");
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
  const locked = await demoLockError("catalogue", user.email, "/admin/plans");
  if (locked) return { ok: false, error: locked };
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

/** Turns a plan off (advisors and the website stop offering it) or on again. */
export async function togglePlan(formData: FormData) {
  const user = await requirePermission("plans:manage");
  await assertNotDemoLocked("catalogue", user.email, "/admin/plans");
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, id.parse(formData.get("planId"))));
  if (!plan) throw new Error("errors.notFound");

  await db.update(plans).set({ active: !plan.active }).where(eq(plans.id, plan.id));
  await logAudit({
    userId: user.id,
    action: plan.active ? "deactivate" : "activate",
    entity: "plan",
    entityId: plan.id,
    details: plan.name.en,
  });
  revalidatePath("/admin/plans");
}

/**
 * Saves a plan's price, excess, benefits and add-ons. Add-ons are matched by key: existing rows change in place, new
 * ones come from the product's catalogue, and "off" retires a row instead of deleting it. Quotes are never touched,
 * because each keeps its own snapshot of the plan and add-ons it was priced with.
 */
export async function savePlan(input: PlanEditInput): Promise<ActionResult> {
  const user = await requirePermission("plans:manage");
  const locked = await demoLockError("catalogue", user.email, "/admin/plans");
  if (locked) return { ok: false, error: locked };
  const parsed = planEditSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { planId, basePremium, excess, benefits, addOns } = parsed.data;

  const [plan] = await db.select().from(plans).where(eq(plans.id, planId));
  if (!plan) return { ok: false, error: "errors.notFound" };
  const existing = await db.select().from(planAddOns).where(eq(planAddOns.planId, plan.id));
  const catalogue: readonly { key: string; name: Localized }[] = isWebsiteProduct(plan.product)
    ? WEBSITE_ADD_ONS[plan.product]
    : [];

  const changes: string[] = [];
  for (const { key, offer, price } of addOns) {
    const row = existing.find((a) => a.key === key);
    // Included means free, whatever price was typed
    const values = {
      kind: offer === "off" ? (row?.kind ?? "optional") : offer,
      price: offer === "included" ? 0 : price,
      active: offer !== "off",
    };
    if (row) {
      if (row.kind === values.kind && row.price === values.price && row.active === values.active) continue;
      await db.update(planAddOns).set(values).where(eq(planAddOns.id, row.id));
      changes.push(`${row.name.en}: ${offer === "off" ? "off" : `${values.kind} ${values.price}`}`);
    } else if (offer !== "off") {
      const item = catalogue.find((c) => c.key === key);
      if (!item) return { ok: false, error: "errors.addOnUnavailable" };
      await db.insert(planAddOns).values({ planId: plan.id, key, name: item.name, ...values });
      changes.push(`${item.name.en}: added, ${values.kind} ${values.price}`);
    }
  }

  await db.update(plans).set({ basePremium, excess, benefits }).where(eq(plans.id, plan.id));
  if (plan.basePremium !== basePremium) changes.unshift(`price ${plan.basePremium} → ${basePremium}`);
  if (plan.excess !== excess) changes.unshift(`excess ${plan.excess} → ${excess}`);
  if (plan.benefits.join("|") !== benefits.join("|")) changes.push("benefits");
  await logAudit({
    userId: user.id,
    action: "update",
    entity: "plan",
    entityId: plan.id,
    details: `${plan.name.en}: ${changes.join("; ") || "no changes"}`,
  });
  revalidatePath("/admin/plans");
  return { ok: true };
}
