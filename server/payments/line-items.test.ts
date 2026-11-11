import { describe, expect, it } from "vitest";
import type { QuoteAddOn } from "@/constants/add-ons";
import { toCents, toLineItems } from "./line-items";

const addOn = (key: string, kind: QuoteAddOn["kind"], price: number): QuoteAddOn => ({
  key,
  name: { en: `Add-on ${key}` },
  kind,
  price,
});

// The quote snapshot keeps add-ons in plan order: an optional one can come before the included one
const QUOTE = {
  insurer: "Northwind Assurance",
  planName: "Northwind Plus",
  addOns: [addOn("windscreen", "optional", 35), addOn("roadside", "included", 0), addOn("driver", "preselected", 30)],
  premium: 1175,
};

describe("toLineItems", () => {
  it("plan line plus included at 0 plus chosen add-ons", () => {
    expect(toLineItems(QUOTE).lines).toEqual([
      { name: "Northwind Assurance Northwind Plus", quantity: 1, amount: 1110 },
      { name: "Add-on roadside", quantity: 1, amount: 0 },
      { name: "Add-on windscreen", quantity: 1, amount: 35 },
      { name: "Add-on driver", quantity: 1, amount: 30 },
    ]);
  });

  it("lines add up to the quote premium", () => {
    const { lines, totalDollars } = toLineItems(QUOTE);
    expect(totalDollars).toBe(1175);
    expect(lines.reduce((sum, l) => sum + l.amount * l.quantity, 0)).toBe(1175);
    // No add-ons at all: one plan line for the whole premium
    expect(toLineItems({ ...QUOTE, addOns: [], premium: 900 }).lines).toEqual([
      { name: "Northwind Assurance Northwind Plus", quantity: 1, amount: 900 },
    ]);
  });

  it("cents are dollars × 100", () => {
    expect(toCents(1175)).toBe(117_500);
    expect(toCents(0)).toBe(0);
  });
});
