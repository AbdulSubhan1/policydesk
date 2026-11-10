"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { QUOTE_DECISIONS } from "@/constants/statuses";
import type { ActionResult } from "@/schemas/action-result";
import { id, option } from "@/schemas/fields";
import { quoteSchema, type QuoteInput } from "@/schemas/quote";
import { logAudit } from "@/server/audit";
import { db, schema } from "@/server/db";
import { requireLead, requireQuote } from "@/server/guards";

const { leads, quotes, plans, insurers } = schema;

export async function createQuote(input: QuoteInput): Promise<ActionResult> {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { user, lead, opportunity } = await requireLead("quotes:create", parsed.data.leadId);

  const [plan] = await db
    .select({ plan: plans, insurerName: insurers.name })
    .from(plans)
    .innerJoin(insurers, eq(plans.insurerId, insurers.id))
    .where(
      and(
        eq(plans.id, parsed.data.planId),
        eq(plans.active, true),
        eq(insurers.active, true),
        eq(plans.product, opportunity.product),
      ),
    );
  if (!plan) return { ok: false, error: "errors.planUnavailable" };

  const [quote] = await db
    .insert(quotes)
    .values({
      leadId: lead.id,
      planId: plan.plan.id,
      insurer: plan.insurerName,
      planName: plan.plan.name,
      cover: plan.plan.cover,
      premium: parsed.data.premium,
      createdBy: user.id,
    })
    .returning();
  if (lead.stage === "needs_analysis") {
    await db.update(leads).set({ stage: "quoted", updatedAt: new Date() }).where(eq(leads.id, lead.id));
  }
  await logAudit({
    userId: user.id,
    action: "create",
    entity: "quote",
    entityId: quote.id,
    leadId: lead.id,
    details: `${quote.insurer}, ${quote.planName.en}`,
  });
  revalidatePath(`/leads/${lead.id}`);
  return { ok: true };
}

export async function setQuoteStatus(formData: FormData) {
  const status = option(QUOTE_DECISIONS).parse(formData.get("status"));
  const { user, lead, quote } = await requireQuote("quotes:approve", id.parse(formData.get("quoteId")));

  await db.update(quotes).set({ status }).where(eq(quotes.id, quote.id));
  await logAudit({
    userId: user.id,
    action: status,
    entity: "quote",
    entityId: quote.id,
    leadId: lead.id,
    details: quote.insurer,
  });
  revalidatePath(`/leads/${lead.id}`);
}
