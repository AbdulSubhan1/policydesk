import { describe, expect, it } from "vitest";
import type { QuoteAddOn } from "@/constants/add-ons";
import { addOnCost, quoteBreakdown, quoteTotal } from "./quote-price";

const ADD_ONS = [
  { id: 1, kind: "included" as const, price: 25 },
  { id: 2, kind: "optional" as const, price: 60 },
  { id: 3, kind: "preselected" as const, price: 30 },
  { id: 4, kind: "optional" as const, price: 80 },
];

const snapshot = (key: string, kind: QuoteAddOn["kind"], price: number): QuoteAddOn => ({
  key,
  name: { en: key },
  kind,
  price,
});

describe("addOnCost", () => {
  it("adds the ticked add-ons and never charges for included ones", () => {
    expect(addOnCost(ADD_ONS, [])).toBe(0);
    expect(addOnCost(ADD_ONS, [2, 3])).toBe(90);
    // Ticking an included add-on (or one of another plan) costs nothing
    expect(addOnCost(ADD_ONS, [1, 2, 99])).toBe(60);
  });
});

describe("quoteTotal", () => {
  it("takes the discount off the plan and add-ons", () => {
    expect(quoteTotal({ subtotal: 1380 })).toEqual({ ok: true, total: 1380, discount: 0, overridden: false });
    expect(quoteTotal({ subtotal: 1380, discount: 50 })).toEqual({
      ok: true,
      total: 1330,
      discount: 50,
      overridden: false,
    });
  });

  it("refuses a discount that leaves nothing to pay", () => {
    expect(quoteTotal({ subtotal: 500, discount: 500 })).toEqual({ ok: false, error: "validation.discountTooHigh" });
  });

  it("uses the insurer's price when it was typed, with no discount on top", () => {
    expect(quoteTotal({ subtotal: 1380, discount: 50, override: 1295 })).toEqual({
      ok: true,
      total: 1295,
      discount: 0,
      overridden: true,
    });
  });
});

describe("quoteBreakdown", () => {
  it("adds up a website quote from its snapshot", () => {
    const b = quoteBreakdown({
      premium: 1140,
      addOns: [snapshot("roadside", "included", 0), snapshot("driver", "preselected", 30)],
      planPremium: null,
      discount: 0,
      priceOverridden: false,
    });
    expect(b).toMatchObject({ plan: 1110, discount: 0, adjustment: 0, total: 1140 });
  });

  it("shows the advisor's discount as its own line", () => {
    const b = quoteBreakdown({
      premium: 1225,
      addOns: [snapshot("roadside", "included", 0), snapshot("replacement", "optional", 60)],
      planPremium: 1215,
      discount: 50,
      priceOverridden: false,
    });
    expect(b.plan + 60 - b.discount + b.adjustment).toBe(b.total);
    expect(b).toMatchObject({ plan: 1215, discount: 50, adjustment: 0, total: 1225 });
  });

  it("explains an override as the difference to the insurer's price", () => {
    const b = quoteBreakdown({
      premium: 1295,
      addOns: [snapshot("replacement", "optional", 60)],
      planPremium: 1320,
      discount: 0,
      priceOverridden: true,
    });
    expect(b).toMatchObject({ plan: 1320, adjustment: -85, total: 1295 });
  });
});
