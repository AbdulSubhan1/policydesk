import { describe, expect, it } from "vitest";
import { PLAN_BENEFITS } from "@/constants/benefits";
import { WEBSITE_PRODUCTS } from "@/constants/website";
import { needsBenefitFix, pickBenefits } from "./benefits";

describe("pickBenefits", () => {
  it("takes the count from the product's list, starting at the offset and wrapping", () => {
    const list = PLAN_BENEFITS.travel;
    expect(pickBenefits("travel", 3, 1)).toEqual([list[1], list[2], list[3]]);
    expect(pickBenefits("travel", 2, list.length - 1)).toEqual([list[list.length - 1], list[0]]);
  });

  it("is deterministic: the same plan always gets the same benefits", () => {
    expect(pickBenefits("home", 3, 41)).toEqual(pickBenefits("home", 3, 41));
  });

  it("never repeats a benefit, even when more are asked than the list has", () => {
    const picked = pickBenefits("health", 20, 5);
    expect(picked).toHaveLength(PLAN_BENEFITS.health.length);
    expect(new Set(picked).size).toBe(picked.length);
  });

  it("only picks benefits of the plan's own product", () => {
    for (const product of WEBSITE_PRODUCTS) {
      for (const benefit of pickBenefits(product, 4, 7)) expect(PLAN_BENEFITS[product]).toContain(benefit);
    }
  });
});

describe("needsBenefitFix", () => {
  it("travel plan with roadside assistance needs fixing", () => {
    expect(needsBenefitFix("travel", ["Emergency medical cover", "Roadside assistance"])).toBe(true);
  });

  it("plan whose benefits all belong to its product is left alone", () => {
    expect(needsBenefitFix("car", ["Roadside assistance", "24/7 claims helpline"])).toBe(false);
    expect(needsBenefitFix("home", [])).toBe(false);
  });

  it("a fixed plan no longer needs fixing", () => {
    expect(needsBenefitFix("health", pickBenefits("health", 3, 9))).toBe(false);
  });
});

describe("PLAN_BENEFITS", () => {
  it("each website product has 6 to 8 distinct benefits", () => {
    for (const product of WEBSITE_PRODUCTS) {
      const list = PLAN_BENEFITS[product];
      expect(list.length).toBeGreaterThanOrEqual(6);
      expect(list.length).toBeLessThanOrEqual(8);
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it("car keeps no travel-only benefits", () => {
    expect(PLAN_BENEFITS.car).not.toContain("Worldwide cover");
    expect(PLAN_BENEFITS.car).not.toContain("Emergency evacuation");
  });
});
