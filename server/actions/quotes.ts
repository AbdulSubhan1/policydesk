"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { QUOTE_DECISIONS } from "@/constants/statuses";
import { money } from "@/lib/format";
import { quoteTotal } from "@/lib/quote-price";
import { quoteReference } from "@/lib/reference";
import type { ActionResult } from "@/schemas/action-result";
import { id, option } from "@/schemas/fields";
import { quoteSchema, type QuoteInput } from "@/schemas/quote";
import { logAudit } from "@/server/audit";
import { db, schema } from "@/server/db";
import { requireLead, requireQuote } from "@/server/guards";
import { premiumFor } from "@/server/website/plans";
import { priceSelection } from "@/server/website/pricing";

const { leads, quotes, plans, planAddOns, insurers } = schema;

/**
 * Adds an advisor's quote from a plan. The price is worked out here again from the plan (rated from the customer's
 * answers like on the website) and the ticked add-on ids, so the form's total is only a preview. The quote keeps a
 * snapshot of its add-ons, plan price and discount; an insurer's price typed instead is kept as an override.
 */
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

  const planPremium = premiumFor(opportunity.product, plan.plan, opportunity.details);
  const addOns = await db.select().from(planAddOns).where(eq(planAddOns.planId, plan.plan.id));
  const priced = priceSelection({ id: plan.plan.id, basePremium: planPremium }, addOns, parsed.data.addOnIds);
  if (!priced.ok) return { ok: false, error: "errors.addOnUnavailable" };
  const total = quoteTotal({ subtotal: priced.total, ...parsed.data });
  if (!total.ok) return { ok: false, error: total.error };

  const [{ existing }] = await db.select({ existing: count() }).from(quotes).where(eq(quotes.leadId, lead.id));
  const [quote] = await db
    .insert(quotes)
    .values({
      leadId: lead.id,
      reference: quoteReference(lead.reference, existing + 1),
      planId: plan.plan.id,
      insurer: plan.insurerName,
      planName: plan.plan.name,
      cover: plan.plan.cover,
      premium: total.total,
      addOns: priced.addOns,
      planPremium,
      discount: total.discount,
      priceOverridden: total.overridden,
      createdBy: user.id,
    })
    .returning();
  if (lead.stage === "needs_analysis") {
    await db.update(leads).set({ stage: "quoted", updatedAt: new Date() }).where(eq(leads.id, lead.id));
  }
  const price = total.overridden
    ? `${money(total.total)}, the insurer's price (worked out ${money(priced.total)})`
    : total.discount
      ? `${money(total.total)} after a ${money(total.discount)} discount`
      : money(total.total);
  await logAudit({
    userId: user.id,
    action: "create",
    entity: "quote",
    entityId: quote.id,
    leadId: lead.id,
    details: `${quote.reference}, ${quote.insurer}, ${quote.planName.en} · ${price}`,
  });
  revalidatePath("/leads/[id]", "page");
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
  revalidatePath("/leads/[id]", "page");
}
