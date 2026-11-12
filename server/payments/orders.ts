import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { ADVISOR_ROLE } from "@/constants/config";
import type { OrderStatus } from "@/constants/statuses";
import { maskEmail, maskPhone, money } from "@/lib/format";
import { logAudit } from "@/server/audit";
import { db, schema } from "@/server/db";
import type { OrderLine } from "@/server/db/schema";
import { assignByRole } from "@/server/website/assign";
import { openOnlineQuote } from "@/server/website/plans";
import { toCents, toLineItems } from "./line-items";
import { PaySandboxError, createCheckoutSession, getCheckoutSession, getPayment, paymentsEnabled } from "./paysandbox";
import type { PaySandboxEvent } from "./webhook";

// Website orders: one per PaySandbox checkout session. The webhook (or a re-check when the visitor is back
// first) marks one paid, which accepts the quote and assigns the advisor. No policy is booked here.

const { opportunities, leads, quotes, orders, users, webhookEvents } = schema;

type Order = typeof orders.$inferSelect;
type Quote = typeof quotes.$inferSelect;

/** A line as the website shows it, in whole dollars. */
export type WebsiteLine = { label: string; amount: number };

export type PaymentSummary = {
  status: "ready" | "already_paid";
  lines: WebsiteLine[];
  total: number;
  quoteReference: string;
};

export type WebsiteOrderView = {
  order: {
    status: "pending" | "paid";
    lines: WebsiteLine[];
    total: number;
    paidAt: string | null;
    paymentId: string | null;
    quoteReference: string;
    emailMasked: string;
    phoneMasked: string;
  } | null;
  advisor: { role: "advisor"; name: string; email: string; phone: string } | null;
};

type Failure =
  | { ok: false; status: 404; code: "not_found" }
  | { ok: false; status: 409; code: "no_lead" | "no_selection" | "already_paid" }
  | { ok: false; status: 502; code: "paysandbox_unavailable" }
  | { ok: false; status: 503; code: "payments_disabled" };

const NOT_FOUND = { ok: false, status: 404, code: "not_found" } as const;
const NO_LEAD = { ok: false, status: 409, code: "no_lead" } as const;
const NO_SELECTION = { ok: false, status: 409, code: "no_selection" } as const;
const ALREADY_PAID = { ok: false, status: 409, code: "already_paid" } as const;
const UNAVAILABLE = { ok: false, status: 502, code: "paysandbox_unavailable" } as const;
const DISABLED = { ok: false, status: 503, code: "payments_disabled" } as const;

const toWebsiteLines = (lines: OrderLine[]) => lines.map((l) => ({ label: l.name, amount: l.amount }));

const linesOf = (quote: Quote) =>
  toLineItems({ insurer: quote.insurer, planName: quote.planName.en, addOns: quote.addOns, premium: quote.premium });

/** The opportunity's contact details and its first lead (only the full form makes one). */
async function websiteLead(publicId: string) {
  const [row] = await db
    .select({ email: opportunities.email, phone: opportunities.phone, product: opportunities.product, lead: leads })
    .from(opportunities)
    .leftJoin(leads, and(eq(leads.opportunityId, opportunities.id), eq(leads.type, "new_business")))
    .where(eq(opportunities.publicId, publicId));
  return row;
}

/** The order to show the visitor: a paid one if there is one, otherwise the newest pending one. */
async function currentOrder(leadId: number, statuses: OrderStatus[] = ["pending", "paid"]) {
  const [row] = await db
    .select({ order: orders, quoteReference: quotes.reference })
    .from(orders)
    .innerJoin(quotes, eq(orders.quoteId, quotes.id))
    .where(and(eq(orders.leadId, leadId), inArray(orders.status, statuses)))
    .orderBy(sql`${orders.status} = 'paid' desc`, desc(orders.id))
    .limit(1);
  return row;
}

export async function getPaymentSummary(publicId: string): Promise<{ ok: true; payment: PaymentSummary } | Failure> {
  const found = await websiteLead(publicId);
  if (!found) return NOT_FOUND;
  if (!found.lead) return NO_LEAD;

  const paid = await currentOrder(found.lead.id, ["paid"]);
  if (paid) {
    return {
      ok: true,
      payment: {
        status: "already_paid",
        lines: toWebsiteLines(paid.order.lineItems),
        total: paid.order.amount,
        quoteReference: paid.quoteReference,
      },
    };
  }
  const quote = await openOnlineQuote(found.lead.id);
  if (!quote) return NO_SELECTION;
  const { lines, totalDollars } = linesOf(quote);
  return {
    ok: true,
    payment: { status: "ready", lines: toWebsiteLines(lines), total: totalDollars, quoteReference: quote.reference },
  };
}

/** Same quote, same lines, and PaySandbox still has the session open: send the visitor back to it. */
function reusable(order: Order, quoteId: number, lines: OrderLine[], now: Date) {
  const sameLines =
    order.lineItems.length === lines.length &&
    order.lineItems.every((l, i) => l.name === lines[i].name && l.amount === lines[i].amount);
  return order.quoteId === quoteId && sameLines && !!order.checkoutUrl && !!order.expiresAt && order.expiresAt > now;
}

/**
 * Sends the visitor to PaySandbox for their saved selection. Pressing Pay again reuses the open session; a changed
 * selection expires the old order and starts a new session for the new total.
 */
export async function startPayment(publicId: string): Promise<{ ok: true; checkoutUrl: string } | Failure> {
  const websiteUrl = process.env.WEBSITE_URL;
  if (!paymentsEnabled() || !websiteUrl) return DISABLED;
  const found = await websiteLead(publicId);
  if (!found) return NOT_FOUND;
  const { lead, email, product } = found;
  if (!lead) return NO_LEAD;
  if (await currentOrder(lead.id, ["paid"])) return ALREADY_PAID;
  const quote = await openOnlineQuote(lead.id);
  if (!quote) return NO_SELECTION;
  const { lines, totalDollars } = linesOf(quote);

  const now = new Date();
  const pending = await currentOrder(lead.id, ["pending"]);
  if (pending && reusable(pending.order, quote.id, lines, now)) {
    // Paid already, with the webhook still on its way
    if (await refreshOrder(pending.order)) return ALREADY_PAID;
    return { ok: true, checkoutUrl: pending.order.checkoutUrl! };
  }

  // The old sessions stay payable at PaySandbox; a late payment on one is still recorded on its own order
  await db
    .update(orders)
    .set({ status: "expired", updatedAt: now })
    .where(and(eq(orders.leadId, lead.id), eq(orders.status, "pending")));
  const [order] = await db
    .insert(orders)
    .values({ leadId: lead.id, quoteId: quote.id, amount: totalDollars, lineItems: lines })
    .returning();

  let session: Awaited<ReturnType<typeof createCheckoutSession>>;
  try {
    session = await createCheckoutSession({
      amountCents: toCents(totalDollars),
      lineItems: lines.map((l) => ({ ...l, amount: toCents(l.amount) })),
      // Each line of business has its pages under its product's slug on the website (/car/…, /travel/…)
      successUrl: `${websiteUrl}/${product}/thank-you`,
      cancelUrl: `${websiteUrl}/${product}/payment`,
      customerEmail: email,
      idempotencyKey: `order-${order.publicId}`,
    });
  } catch (e) {
    if (!(e instanceof PaySandboxError)) throw e;
    console.error(`PaySandbox refused a checkout for order ${order.id}: ${e.message}`);
    await db.update(orders).set({ status: "expired", updatedAt: new Date() }).where(eq(orders.id, order.id));
    return UNAVAILABLE;
  }

  await db
    .update(orders)
    .set({
      checkoutSessionId: session.id,
      checkoutUrl: session.url,
      expiresAt: new Date(session.expiresAt * 1000),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));
  await logAudit({
    userId: null,
    action: "checkout",
    entity: "order",
    entityId: order.id,
    leadId: lead.id,
    details: `${money(totalDollars)} · ${session.id}`,
  });
  return { ok: true, checkoutUrl: session.url };
}

/** Picks the advisor once a lead is paid, unless someone already works it. */
async function assignAdvisor(leadId: number) {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (lead.advisorId) return;

  const person = await assignByRole(lead.departmentId, ADVISOR_ROLE);
  if (person) {
    await db
      .update(leads)
      .set({ advisorId: person.id, updatedAt: new Date() })
      .where(and(eq(leads.id, leadId), isNull(leads.advisorId)));
  }
  await logAudit({
    userId: null,
    action: "auto_assign",
    entity: "lead",
    entityId: leadId,
    leadId,
    details: person ? `Advisor ${person.name} (fewest open)` : "No advisor available",
  });
}

/**
 * Records a PaySandbox payment on its order. Safe to call twice (webhook and re-check, or a replayed webhook): only
 * the call that flips the status does anything, and the others return false. The lead stays quoted; booking sets won.
 */
export async function markPaid(order: Order, paymentId: string): Promise<boolean> {
  const now = new Date();
  const pay = (from: OrderStatus) =>
    db
      .update(orders)
      .set({ status: "paid", paymentId, paidAt: now, updatedAt: now })
      .where(and(eq(orders.id, order.id), eq(orders.status, from)))
      .returning();
  let [paid] = await pay("pending");
  // Paid on a session the visitor replaced by choosing again: kept and audited, but the newer selection stays open
  const superseded = !paid;
  if (!paid) [paid] = await pay("expired");
  if (!paid) return false;

  await logAudit({
    userId: null,
    action: "paid",
    entity: "order",
    entityId: paid.id,
    leadId: paid.leadId,
    details: `${money(paid.amount)} · ${paymentId}${superseded ? " · earlier selection" : ""}`,
  });
  if (!superseded) {
    const [quote] = await db
      .update(quotes)
      .set({ status: "accepted" })
      .where(and(eq(quotes.id, paid.quoteId), eq(quotes.status, "sent")))
      .returning();
    if (quote) {
      await logAudit({
        userId: null,
        action: "accepted",
        entity: "quote",
        entityId: quote.id,
        leadId: paid.leadId,
        details: quote.insurer,
      });
    }
  }
  await assignAdvisor(paid.leadId);
  return true;
}

/** For a visitor back before the webhook: asks PaySandbox about the session and records the payment. True once paid. */
export async function refreshOrder(order: Order): Promise<boolean> {
  if (order.status !== "pending" || !order.checkoutSessionId || !paymentsEnabled()) return false;
  try {
    const session = await getCheckoutSession(order.checkoutSessionId);
    if (session.status !== "complete" || !session.payment) return false;
    const payment = await getPayment(session.payment);
    if (payment.status !== "succeeded") return false;
    await markPaid(order, payment.id);
    return true;
  } catch (e) {
    // PaySandbox is down: the order stays pending and the webhook still settles it
    if (e instanceof PaySandboxError) return false;
    throw e;
  }
}

/** The thank-you page's data: the paid (or still pending) order and the advisor. Contact details are masked. */
export async function getWebsiteOrder(publicId: string): Promise<{ ok: true; view: WebsiteOrderView } | Failure> {
  const found = await websiteLead(publicId);
  if (!found) return NOT_FOUND;
  if (!found.lead) return { ok: true, view: { order: null, advisor: null } };
  const leadId = found.lead.id;

  let current = await currentOrder(leadId);
  if (current?.order.status === "pending" && (await refreshOrder(current.order))) current = await currentOrder(leadId);
  const [advisor] = await db
    .select({ name: users.name, email: users.email, phone: users.phone })
    .from(leads)
    .innerJoin(users, eq(leads.advisorId, users.id))
    .where(eq(leads.id, leadId));

  const order = current?.order;
  return {
    ok: true,
    view: {
      order: order
        ? {
            status: order.status === "paid" ? "paid" : "pending",
            lines: toWebsiteLines(order.lineItems),
            total: order.amount,
            paidAt: order.paidAt?.toISOString() ?? null,
            paymentId: order.paymentId,
            quoteReference: current.quoteReference,
            emailMasked: maskEmail(found.email),
            phoneMasked: maskPhone(found.phone),
          }
        : null,
      advisor: advisor ? { role: "advisor", ...advisor } : null,
    },
  };
}

/**
 * Applies a verified PaySandbox event once per webhook id. Events for sessions PolicyDesk did not create (the
 * PaySandbox project may serve other apps) and other event types are ignored.
 */
export async function handlePaySandboxEvent(
  webhookId: string,
  event: PaySandboxEvent,
): Promise<{ duplicate: boolean }> {
  const [fresh] = await db
    .insert(webhookEvents)
    .values({ id: webhookId, type: event.type })
    .onConflictDoNothing()
    .returning();
  if (!fresh) return { duplicate: true };

  try {
    await applyEvent(event);
  } catch (e) {
    // Forget the id so PaySandbox's retry is handled instead of skipped as a duplicate
    await db.delete(webhookEvents).where(eq(webhookEvents.id, webhookId));
    throw e;
  }
  return { duplicate: false };
}

async function applyEvent(event: PaySandboxEvent) {
  const payment = event.data.object;
  if (event.type !== "payment.succeeded" && event.type !== "payment.failed") return;
  if (!payment.checkout_session) return;
  const [order] = await db.select().from(orders).where(eq(orders.checkoutSessionId, payment.checkout_session));
  if (!order) return;

  if (event.type === "payment.succeeded") {
    await markPaid(order, payment.id);
    return;
  }
  await logAudit({
    userId: null,
    action: "payment_failed",
    entity: "order",
    entityId: order.id,
    leadId: order.leadId,
    details: [payment.id, payment.decline_code ?? payment.failure_code].filter(Boolean).join(" · "),
  });
}
