"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { dateTime } from "@/lib/format";
import type { ActionResult } from "@/schemas/action-result";
import { id } from "@/schemas/fields";
import { onlinePlanSchema, type OnlinePlanInput } from "@/schemas/website";
import { logAudit } from "@/server/audit";
import { db, schema } from "@/server/db";
import { requireOpportunity } from "@/server/guards";
import { isWebsiteOpportunity } from "@/server/website/opportunities";
import { newPayToken, paidOrderOf, payLinkExpiry } from "@/server/website/pay-links";
import { openOnlineQuote, saveOnlineSelection } from "@/server/website/plans";

// The coordinator's side of the assisted flow after convert: the plan chosen on the call, and the payment link the
// customer pays through on the website.

const { leads, paymentLinks } = schema;

/** A converted website opportunity in the user's scope and its lead. The UI offers nothing else, so anything else throws. */
async function websiteLead(opportunityId: number) {
  const { user, opportunity } = await requireOpportunity("opportunities:convert", opportunityId);
  if (!isWebsiteOpportunity(opportunity)) throw new Error("Only website opportunities are paid online");
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.opportunityId, opportunity.id), eq(leads.type, "new_business")));
  if (!lead) throw new Error("Convert the opportunity first");
  return { user, opportunity, lead };
}

export async function chooseOnlinePlan(input: OnlinePlanInput): Promise<ActionResult> {
  const parsed = onlinePlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { id: opportunityId, ...selection } = parsed.data;
  const { user, opportunity, lead } = await websiteLead(opportunityId);
  if (await paidOrderOf(lead.id)) return { ok: false, error: "errors.alreadyPaid" };

  const saved = await saveOnlineSelection(lead, opportunity.product, selection, user.id);
  if (!saved.ok)
    return { ok: false, error: saved.field === "planId" ? "errors.planUnavailable" : "errors.addOnUnavailable" };
  revalidatePath(`/opportunities/${opportunity.id}`);
  return { ok: true };
}

/**
 * Makes the lead's payment link and returns its URL, the only time anyone sees it. Older links stop working, so a
 * lost link is replaced, never recovered.
 */
export async function createPayLink(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { user, opportunity, lead } = await websiteLead(id.parse(formData.get("id")));
  const websiteUrl = process.env.WEBSITE_URL;
  if (!websiteUrl) return { ok: false, error: "errors.payLinksDisabled" };
  if (await paidOrderOf(lead.id)) return { ok: false, error: "errors.alreadyPaid" };
  if (!(await openOnlineQuote(lead.id))) return { ok: false, error: "errors.noOnlineSelection" };

  const now = new Date();
  await db
    .update(paymentLinks)
    .set({ revokedAt: now })
    .where(and(eq(paymentLinks.leadId, lead.id), isNull(paymentLinks.revokedAt)));
  const { token, hash } = newPayToken();
  const [link] = await db
    .insert(paymentLinks)
    .values({ tokenHash: hash, leadId: lead.id, createdBy: user.id, createdAt: now, expiresAt: payLinkExpiry(now) })
    .returning();
  await logAudit({
    userId: user.id,
    action: "pay_link",
    entity: "payment_link",
    entityId: link.id,
    leadId: lead.id,
    details: `expires ${dateTime(link.expiresAt)}`,
  });
  revalidatePath(`/opportunities/${opportunity.id}`);
  return { ok: true, url: `${websiteUrl}/pay/${token}` };
}

export async function revokePayLink(formData: FormData) {
  const { user, opportunity, lead } = await websiteLead(id.parse(formData.get("id")));
  const [link] = await db
    .select()
    .from(paymentLinks)
    .where(and(eq(paymentLinks.id, id.parse(formData.get("linkId"))), eq(paymentLinks.leadId, lead.id)));
  if (!link) throw new Error("errors.notFound");

  const [revoked] = await db
    .update(paymentLinks)
    .set({ revokedAt: new Date() })
    .where(and(eq(paymentLinks.id, link.id), isNull(paymentLinks.revokedAt)))
    .returning();
  if (revoked) {
    await logAudit({
      userId: user.id,
      action: "pay_link_revoked",
      entity: "payment_link",
      entityId: link.id,
      leadId: lead.id,
    });
  }
  revalidatePath(`/opportunities/${opportunity.id}`);
}
