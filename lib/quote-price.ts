import type { AddOnKind, QuoteAddOn } from "@/constants/add-ons";

// How an advisor's quote adds up. The quote form shows it live and the server works it out again from the ids, so
// both always agree; the quote card reads it back from the quote's own snapshot.

type AddOnChoice = { id: number; kind: AddOnKind; price: number };

/** What the add-ons cost: the ticked ones at their price; included ones are free whatever price the row holds. */
export function addOnCost(addOns: AddOnChoice[], tickedIds: number[]) {
  return addOns.filter((a) => a.kind !== "included" && tickedIds.includes(a.id)).reduce((sum, a) => sum + a.price, 0);
}

/**
 * The yearly premium: the plan and its add-ons less the discount, or the insurer's own price when the advisor typed
 * one (an override replaces the worked-out total, so no discount applies to it). Never below $1.
 */
export function quoteTotal({
  subtotal,
  discount = 0,
  override,
}: {
  subtotal: number;
  discount?: number;
  override?: number;
}) {
  if (override !== undefined) return { ok: true as const, total: override, discount: 0, overridden: true };
  if (discount >= subtotal) return { ok: false as const, error: "validation.discountTooHigh" };
  return { ok: true as const, total: subtotal - discount, discount, overridden: false };
}

type SavedQuote = {
  premium: number;
  addOns: QuoteAddOn[];
  planPremium: number | null;
  discount: number;
  priceOverridden: boolean;
};

/**
 * A saved quote as lines that add up to its premium: the plan, each add-on, the discount, and the difference to the
 * insurer's price when it was overridden. Older quotes kept no plan price, so theirs is what is left of the premium.
 */
export function quoteBreakdown(quote: SavedQuote) {
  const addOnTotal = quote.addOns.reduce((sum, a) => sum + (a.kind === "included" ? 0 : a.price), 0);
  const plan = quote.planPremium ?? quote.premium + quote.discount - addOnTotal;
  const workedOut = plan + addOnTotal - quote.discount;
  return {
    plan,
    addOns: quote.addOns,
    discount: quote.discount,
    adjustment: quote.priceOverridden ? quote.premium - workedOut : 0,
    total: quote.premium,
  };
}
