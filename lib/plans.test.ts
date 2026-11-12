import { describe, expect, it } from "vitest";
import { addOnKinds, plansByInsurer } from "./plans";

describe("plansByInsurer", () => {
  it("counts every plan of an insurer per product, biggest first", () => {
    const counts = plansByInsurer([
      { insurerId: 1, product: "home", count: 2 },
      { insurerId: 1, product: "car", count: 3 },
      { insurerId: 2, product: "travel", count: 1 },
      { insurerId: 2, product: "car", count: 3 },
    ]);
    expect(counts.get(1)).toEqual([
      { product: "car", count: 3 },
      { product: "home", count: 2 },
    ]);
    expect(counts.get(2)).toEqual([
      { product: "car", count: 3 },
      { product: "travel", count: 1 },
    ]);
  });

  it("leaves out insurers without plans", () => {
    expect(plansByInsurer([{ insurerId: 3, product: "car", count: 0 }]).has(3)).toBe(false);
  });
});

describe("addOnKinds", () => {
  it("counts the offered add-ons of each kind", () => {
    expect(
      addOnKinds([
        { kind: "included", active: true },
        { kind: "optional", active: true },
        { kind: "optional", active: true },
        { kind: "preselected", active: true },
        { kind: "optional", active: false },
      ]),
    ).toEqual({ included: 1, optional: 2, preselected: 1 });
  });
});
