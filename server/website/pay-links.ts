import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { PAY_LINK_HOURS } from "@/constants/config";
import type { OrderStatus, PayLinkState } from "@/constants/statuses";
import { logAudit } from "@/server/audit";
import { db, schema } from "@/server/db";

// Payment links a coordinator sends for the assisted flow. The token is shown once; only its sha256 is stored, so a
// database leak gives no working link.

const { paymentLinks, leads, opportunities, orders } = schema;

/** 32 random bytes as base64url: 43 characters, too many to guess. */
export function newPayToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashPayToken(token) };
}

export const hashPayToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const payLinkExpiry = (from: Date) => new Date(from.getTime() + PAY_LINK_HOURS * 3_600_000);

/**
 * What a link does now. Revoked comes first so an old link says nothing about the lead; a paid lead's link sends the
 * customer to the thank-you page even once it has expired.
 */
export function payLinkState(
  link: { expiresAt: Date; revokedAt: Date | null },
  paidOrder: { status: OrderStatus } | null,
  now: Date,
): PayLinkState {
  if (link.revokedAt) return "revoked";
  if (paidOrder?.status === "paid") return "paid";
  return link.expiresAt <= now ? "expired" : "active";
}

/** The lead's paid order, if any: a paid lead has nothing left to pay. */
export async function paidOrderOf(leadId: number) {
  const [order] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(and(eq(orders.leadId, leadId), eq(orders.status, "paid")))
    .limit(1);
  return order ?? null;
}

type OpenResult =
  | { ok: true; publicId: string; status: "active" | "paid" }
  | { ok: false; status: 404; code: "not_found" }
  | { ok: false; status: 410; code: "link_expired" };

/**
 * The website opening a link for the customer: the opportunity to start the journey with, or why not. Unknown and
 * revoked links get the same 404, so a guess learns nothing. The first open is stamped and audited.
 */
export async function openPayLink(token: string): Promise<OpenResult> {
  const [row] = await db
    .select({ link: paymentLinks, publicId: opportunities.publicId })
    .from(paymentLinks)
    .innerJoin(leads, eq(paymentLinks.leadId, leads.id))
    .innerJoin(opportunities, eq(leads.opportunityId, opportunities.id))
    .where(eq(paymentLinks.tokenHash, hashPayToken(token)));
  if (!row) return { ok: false, status: 404, code: "not_found" };

  const { link } = row;
  const state = payLinkState(link, await paidOrderOf(link.leadId), new Date());
  if (state === "revoked") return { ok: false, status: 404, code: "not_found" };
  if (state === "expired") return { ok: false, status: 410, code: "link_expired" };

  const [first] = await db
    .update(paymentLinks)
    .set({ openedAt: new Date() })
    .where(and(eq(paymentLinks.id, link.id), isNull(paymentLinks.openedAt)))
    .returning();
  if (first) {
    await logAudit({
      userId: null,
      action: "pay_link_opened",
      entity: "payment_link",
      entityId: link.id,
      leadId: link.leadId,
    });
  }
  return { ok: true, publicId: row.publicId, status: state };
}
