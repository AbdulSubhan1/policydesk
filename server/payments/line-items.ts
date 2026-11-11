import type { QuoteAddOn } from "@/constants/add-ons";
import type { OrderLine } from "@/server/db/schema";

/** PolicyDesk keeps whole dollars; PaySandbox takes the smallest unit (cents for a USD project). */
export const toCents = (dollars: number) => dollars * 100;

/**
 * What the customer pays for, in dollars: the plan (with its insurer), each included add-on at 0, then each
 * chosen add-on. The plan line is the premium minus the chosen add-ons, so the lines always add up to the premium.
 */
export function toLineItems(quote: { insurer: string; planName: string; addOns: QuoteAddOn[]; premium: number }): {
  lines: OrderLine[];
  totalDollars: number;
} {
  const included = quote.addOns.filter((a) => a.kind === "included");
  const chosen = quote.addOns.filter((a) => a.kind !== "included");
  const chosenTotal = chosen.reduce((sum, a) => sum + a.price, 0);
  return {
    lines: [
      { name: `${quote.insurer} ${quote.planName}`, quantity: 1, amount: quote.premium - chosenTotal },
      ...included.map((a) => ({ name: a.name.en, quantity: 1 as const, amount: 0 })),
      ...chosen.map((a) => ({ name: a.name.en, quantity: 1 as const, amount: a.price })),
    ],
    totalDollars: quote.premium,
  };
}
