import { describe, expect, it } from "vitest";
import type { AddOnKind } from "@/constants/add-ons";
import { priceSelection } from "./pricing";

const PLAN = { id: 1, basePremium: 1000 };

function addOn(id: number, kind: AddOnKind, price: number, extra: { planId?: number; active?: boolean } = {}) {
  return {
    id,
    planId: extra.planId ?? PLAN.id,
    key: `addon_${id}`,
    name: { en: `Add-on ${id}` },
    kind,
    price,
    active: extra.active ?? true,
  };
}

const ADD_ONS = [addOn(10, "included", 0), addOn(11, "preselected", 30), addOn(12, "optional", 60)];

describe("priceSelection", () => {
  it("included add-ons are always on at 0", () => {
    const result = priceSelection(PLAN, ADD_ONS, []);
    expect(result).toMatchObject({
      ok: true,
      lines: [{ label: "Add-on 10", kind: "included", amount: 0 }],
      addOns: [{ key: "addon_10", name: { en: "Add-on 10" }, kind: "included", price: 0 }],
      total: 1000,
    });
  });

  it("preselected counts only when chosen", () => {
    expect(priceSelection(PLAN, ADD_ONS, [11])).toMatchObject({ ok: true, total: 1030 });
    expect(priceSelection(PLAN, ADD_ONS, [])).toMatchObject({ ok: true, total: 1000 });
  });

  it("optional counts when chosen", () => {
    const result = priceSelection(PLAN, ADD_ONS, [12]);
    expect(result).toMatchObject({
      ok: true,
      lines: [
        { label: "Add-on 10", kind: "included", amount: 0 },
        { label: "Add-on 12", kind: "optional", amount: 60 },
      ],
      total: 1060,
    });
  });

  it("total = base + chosen prices", () => {
    const result = priceSelection(PLAN, ADD_ONS, [12, 11]);
    expect(result).toMatchObject({ ok: true, total: 1090 });
    if (result.ok) expect(result.addOns.map((a) => a.key)).toEqual(["addon_10", "addon_11", "addon_12"]);
  });

  it("rejects an included id", () => {
    expect(priceSelection(PLAN, ADD_ONS, [10])).toMatchObject({ ok: false, field: "addOnIds" });
  });

  it("rejects an id of another plan", () => {
    const other = addOn(20, "optional", 40, { planId: 2 });
    expect(priceSelection(PLAN, [...ADD_ONS, other], [20])).toMatchObject({ ok: false, field: "addOnIds" });
  });

  it("rejects an inactive add-on", () => {
    const retired = addOn(13, "optional", 50, { active: false });
    expect(priceSelection(PLAN, [...ADD_ONS, retired], [13])).toMatchObject({ ok: false, field: "addOnIds" });
  });

  it("rejects duplicates", () => {
    expect(priceSelection(PLAN, ADD_ONS, [12, 12])).toMatchObject({ ok: false, field: "addOnIds" });
  });

  it("rejects unknown ids", () => {
    expect(priceSelection(PLAN, ADD_ONS, [999])).toMatchObject({ ok: false, field: "addOnIds" });
  });
});
