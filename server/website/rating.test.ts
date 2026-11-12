import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { coverFits, ratePremium } from "./rating";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-12T10:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("ratePremium", () => {
  it("keeps the base premium when no answers are given", () => {
    for (const product of ["car", "travel", "home", "health"] as const) {
      expect(ratePremium(product, "any", 1000, {})).toBe(1000);
    }
  });

  it("prices the typical car customer at the base premium", () => {
    const typical = { carValue: 18_000, gccSpec: true, dateOfBirth: "1990-04-10", yearsLicensed: 8 };
    expect(ratePremium("car", "comprehensive", 1110, typical)).toBe(1110);
  });

  it("charges more for a dearer car on own-damage cover, not on third party", () => {
    const pricey = { carValue: 80_000 };
    expect(ratePremium("car", "comprehensive", 1000, pricey)).toBeGreaterThan(2000);
    expect(ratePremium("car", "third_party", 800, pricey)).toBe(800);
  });

  it("charges young and new drivers more", () => {
    const young = { dateOfBirth: "2005-01-01", yearsLicensed: 1 };
    expect(ratePremium("car", "third_party", 1000, young)).toBe(1680); // 1.4 × 1.2
  });

  it("prices a trip by length, region, travellers and the oldest age", () => {
    const week = { startDate: "2026-12-01", endDate: "2026-12-07", destination: "asia", travellers: 1, oldestAge: 30 };
    expect(ratePremium("travel", "single_trip", 100, week)).toBe(100);
    expect(ratePremium("travel", "single_trip", 100, { ...week, endDate: "2026-12-20" })).toBe(190);
    expect(ratePremium("travel", "single_trip", 100, { ...week, travellers: 3 })).toBe(250);
    expect(ratePremium("travel", "single_trip", 100, { ...week, oldestAge: 72 })).toBe(220);
    expect(ratePremium("travel", "single_trip", 100, { ...week, destination: "worldwide" })).toBe(160);
  });

  it("ignores trip length on an annual plan", () => {
    const annual = { startDate: "2026-12-01", endDate: "2027-02-01", destination: "asia" };
    expect(ratePremium("travel", "annual_multi_trip", 200, annual)).toBe(200);
  });

  it("prices home cover on the value it insures", () => {
    const home = { buildingValue: 500_000, contentsValue: 20_000, propertyType: "apartment" };
    expect(ratePremium("home", "contents", 600, home)).toBe(600);
    expect(ratePremium("home", "building", 400, home)).toBe(680); // 0.3 + 0.7 × 2
    expect(ratePremium("home", "building", 400, { ...home, propertyType: "villa" })).toBe(780);
  });

  it("prices health on who is covered, age and pre-existing conditions", () => {
    const me = { coverFor: "me", dateOfBirth: "1990-01-01", preExisting: false };
    expect(ratePremium("health", "health_basic", 1000, me)).toBe(1000);
    expect(ratePremium("health", "health_basic", 1000, { ...me, coverFor: "family", children: 2 })).toBe(2750);
    expect(ratePremium("health", "health_basic", 1000, { ...me, preExisting: true })).toBe(1250);
    expect(ratePremium("health", "health_basic", 1000, { ...me, dateOfBirth: "1960-01-01" })).toBe(2400);
  });

  it("rounds to the nearest $5", () => {
    expect(ratePremium("car", "comprehensive", 1003, {}) % 5).toBe(0);
  });
});

describe("coverFits", () => {
  it("shows a tenant contents cover only", () => {
    expect(coverFits("home", "contents", { occupancy: "tenant" })).toBe(true);
    expect(coverFits("home", "building", { occupancy: "tenant" })).toBe(false);
    expect(coverFits("home", "building_contents", { occupancy: "owner" })).toBe(true);
  });

  it("matches travel plans to the trip type and destination", () => {
    expect(coverFits("travel", "annual_multi_trip", { tripType: "annual" })).toBe(true);
    expect(coverFits("travel", "single_trip", { tripType: "annual" })).toBe(false);
    expect(coverFits("travel", "schengen", { tripType: "single", destination: "asia" })).toBe(false);
    expect(coverFits("travel", "schengen", { tripType: "single", destination: "europe_schengen" })).toBe(true);
  });

  it("fits every cover when the answers are missing", () => {
    expect(coverFits("travel", "schengen", {})).toBe(true);
    expect(coverFits("home", "building", {})).toBe(true);
  });
});
