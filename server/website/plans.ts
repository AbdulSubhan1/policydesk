import { and, asc, count, desc, eq, inArray, ne, or } from "drizzle-orm";
import type { AddOnKind } from "@/constants/add-ons";
import type { Product } from "@/constants/products";
import { isWebsiteProduct } from "@/constants/website";
import { money } from "@/lib/format";
import { quoteReference } from "@/lib/reference";
import messages from "@/messages/en.json";
import type { WebsiteSelectionInput } from "@/schemas/website";
import { logAudit } from "@/server/audit";
import { db, schema } from "@/server/db";
import { priceSelection, type SelectionLine } from "./pricing";
import { coverFits, ratePremium } from "./rating";

const { opportunities, leads, plans, insurers, planAddOns, quotes } = schema;

/** A plan card for the website. Labels are English; ids are the plan's and add-ons' own. */
export type WebsitePlan = {
  id: number;
  insurer: string;
  name: string;
  cover: string;
  coverLabel: string;
  excess: number;
  basePremium: number;
  benefits: string[];
  addOns: { id: number; key: string; name: string; kind: AddOnKind; price: number }[];
};

/** The visitor's saved choice: the website quote on their lead, with its priced lines. */
export type WebsiteSelection = {
  quoteReference: string;
  planId: number;
  insurer: string;
  planName: string;
  cover: string;
  coverLabel: string;
  lines: SelectionLine[];
  total: number;
  /** The ticked optional and preselected add-ons, so the website can tick them again */
  addOnIds: number[];
};

type Failure =
  | { ok: false; status: 404; code: "not_found" }
  | { ok: false; status: 409; code: "no_lead" }
  | { ok: false; status: 400; code: "invalid_request"; field: "planId" | "addOnIds"; message: string };

const NOT_FOUND = { ok: false, status: 404, code: "not_found" } as const;
const NO_LEAD = { ok: false, status: 409, code: "no_lead" } as const;

/** The website form's answers, stored on the opportunity. */
type Details = (typeof opportunities.$inferSelect)["details"];

const coverLabel = (cover: string) => (messages.covers as Record<string, string>)[cover] ?? cover;

/** The opportunity's product and its first lead. Only the full form makes a lead, and only leads get plans. */
async function websiteLead(publicId: string) {
  const [row] = await db
    .select({ product: opportunities.product, details: opportunities.details, lead: leads })
    .from(opportunities)
    .leftJoin(leads, and(eq(leads.opportunityId, opportunities.id), eq(leads.type, "new_business")))
    .where(eq(opportunities.publicId, publicId));
  return row;
}

/** Plans an advisor could quote too: active, from an active insurer, for the lead's product. */
function sellablePlans(product: Product) {
  return and(eq(plans.product, product), eq(plans.active, true), eq(insurers.active, true));
}

/** A plan's price for this customer: rated from their answers for the website's products, as stored otherwise. */
function premiumFor(product: Product, plan: { cover: string; basePremium: number }, details: Details) {
  return isWebsiteProduct(product) ? ratePremium(product, plan.cover, plan.basePremium, details) : plan.basePremium;
}

/**
 * Sellable plans for a product priced for the customer's answers, cheapest first, each with its active add-ons.
 * Plans whose cover doesn't suit the answers are left out, unless that would leave none.
 */
export async function loadSellablePlans(product: Product, details: Details = {}) {
  const rows = await db
    .select({ plan: plans, insurer: insurers.name })
    .from(plans)
    .innerJoin(insurers, eq(plans.insurerId, insurers.id))
    .where(sellablePlans(product))
    .orderBy(asc(plans.basePremium), asc(plans.id));
  const addOns = rows.length
    ? await db
        .select()
        .from(planAddOns)
        .where(
          and(
            inArray(
              planAddOns.planId,
              rows.map((r) => r.plan.id),
            ),
            eq(planAddOns.active, true),
          ),
        )
        .orderBy(asc(planAddOns.id))
    : [];
  const fitting = isWebsiteProduct(product) ? rows.filter((r) => coverFits(product, r.plan.cover, details)) : rows;
  return (fitting.length ? fitting : rows)
    .map((r) => ({
      ...r,
      plan: { ...r.plan, basePremium: premiumFor(product, r.plan, details) },
      addOns: addOns.filter((a) => a.planId === r.plan.id),
    }))
    .sort((a, b) => a.plan.basePremium - b.plan.basePremium || a.plan.id - b.plan.id);
}

export async function getWebsitePlans(publicId: string): Promise<{ ok: true; plans: WebsitePlan[] } | Failure> {
  const found = await websiteLead(publicId);
  if (!found) return NOT_FOUND;
  if (!found.lead) return NO_LEAD;

  const rows = await loadSellablePlans(found.product, found.details);
  return {
    ok: true,
    plans: rows.map(({ plan, insurer, addOns }) => ({
      id: plan.id,
      insurer,
      name: plan.name.en,
      cover: plan.cover,
      coverLabel: coverLabel(plan.cover),
      excess: plan.excess,
      basePremium: plan.basePremium,
      benefits: plan.benefits,
      addOns: addOns.map((a) => ({ id: a.id, key: a.key, name: a.name.en, kind: a.kind, price: a.price })),
    })),
  };
}

/** The lead's one open online quote: picked on the website or by the coordinator, still waiting to be paid. */
export async function openOnlineQuote(leadId: number) {
  const [quote] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.leadId, leadId), eq(quotes.online, true), eq(quotes.status, "sent")))
    .orderBy(desc(quotes.id))
    .limit(1);
  return quote;
}

/** Lines come from the quote's own snapshot, so they always add up to the premium that was saved. */
function toSelection(quote: typeof quotes.$inferSelect, addOnIds: number[]): WebsiteSelection {
  const addOnTotal = quote.addOns.reduce((sum, a) => sum + a.price, 0);
  return {
    quoteReference: quote.reference,
    planId: quote.planId ?? 0,
    insurer: quote.insurer,
    planName: quote.planName.en,
    cover: quote.cover,
    coverLabel: coverLabel(quote.cover),
    lines: [
      { label: quote.planName.en, kind: "plan", amount: quote.premium - addOnTotal },
      ...quote.addOns.map((a) => ({ label: a.name.en, kind: a.kind, amount: a.price })),
    ],
    total: quote.premium,
    addOnIds,
  };
}

/** The saved selection for a lead, or null. Add-on ids are looked up again by key from the quote's snapshot. */
export async function getWebsiteSelection(leadId: number): Promise<WebsiteSelection | null> {
  const quote = await openOnlineQuote(leadId);
  if (!quote) return null;

  const ticked = quote.addOns.filter((a) => a.kind !== "included").map((a) => a.key);
  const ids =
    quote.planId && ticked.length
      ? await db
          .select({ id: planAddOns.id })
          .from(planAddOns)
          .where(
            and(eq(planAddOns.planId, quote.planId), inArray(planAddOns.key, ticked), ne(planAddOns.kind, "included")),
          )
          .orderBy(asc(planAddOns.id))
      : [];
  return toSelection(
    quote,
    ids.map((r) => r.id),
  );
}

/** The website's choice for its visitor: priced and saved like a coordinator's, with no user. */
export async function saveWebsiteSelection(
  publicId: string,
  input: WebsiteSelectionInput,
): Promise<{ ok: true; selection: WebsiteSelection } | Failure> {
  const found = await websiteLead(publicId);
  if (!found) return NOT_FOUND;
  if (!found.lead) return NO_LEAD;
  return saveOnlineSelection(found.lead, found, input, null);
}

/**
 * Prices a plan for the customer's answers with its ticked add-ons and saves them as the lead's online quote, for the
 * website (userId null) or a coordinator. Choosing again updates that same quote (same reference), so a lead never has more than one open
 * online selection; its creator becomes whoever chose last.
 */
export async function saveOnlineSelection(
  lead: typeof leads.$inferSelect,
  { product, details }: { product: Product; details: Details },
  input: WebsiteSelectionInput,
  userId: number | null,
): Promise<{ ok: true; selection: WebsiteSelection } | Extract<Failure, { status: 400 }>> {
  const [row] = await db
    .select({ plan: plans, insurer: insurers.name })
    .from(plans)
    .innerJoin(insurers, eq(plans.insurerId, insurers.id))
    .where(and(eq(plans.id, input.planId), sellablePlans(product)));
  if (!row) {
    return { ok: false, status: 400, code: "invalid_request", field: "planId", message: "Plan is not available" };
  }
  const { plan, insurer } = row;

  // The chosen ids are loaded too, wherever they belong, so pricing can say why one is refused
  const addOns = await db
    .select()
    .from(planAddOns)
    .where(
      input.addOnIds.length
        ? or(eq(planAddOns.planId, plan.id), inArray(planAddOns.id, input.addOnIds))
        : eq(planAddOns.planId, plan.id),
    )
    .orderBy(asc(planAddOns.id));
  const priced = priceSelection(
    { id: plan.id, basePremium: premiumFor(product, plan, details) },
    addOns,
    input.addOnIds,
  );
  if (!priced.ok) return { ...priced, status: 400, code: "invalid_request" };

  const values = {
    planId: plan.id,
    insurer,
    planName: plan.name,
    cover: plan.cover,
    premium: priced.total,
    addOns: priced.addOns,
    createdBy: userId,
  };
  const existing = await openOnlineQuote(lead.id);
  let quote: typeof quotes.$inferSelect;
  if (existing) {
    [quote] = await db.update(quotes).set(values).where(eq(quotes.id, existing.id)).returning();
  } else {
    // Numbered like server/actions/quotes.ts: the next -Q<n> on this lead
    const [{ made }] = await db.select({ made: count() }).from(quotes).where(eq(quotes.leadId, lead.id));
    [quote] = await db
      .insert(quotes)
      .values({ ...values, leadId: lead.id, reference: quoteReference(lead.reference, made + 1), online: true })
      .returning();
  }
  if (lead.stage === "needs_analysis") {
    await db.update(leads).set({ stage: "quoted", updatedAt: new Date() }).where(eq(leads.id, lead.id));
  }
  await logAudit({
    userId,
    action: "select",
    entity: "quote",
    entityId: quote.id,
    leadId: lead.id,
    details: `${insurer}, ${plan.name.en} · ${money(priced.total)}`,
  });

  const chosen = new Set(input.addOnIds);
  return {
    ok: true,
    selection: toSelection(
      quote,
      addOns.filter((a) => chosen.has(a.id)).map((a) => a.id),
    ),
  };
}
