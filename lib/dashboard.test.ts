import { describe, expect, it } from "vitest";
import { attentionCards, daysSince, daysUntil, percentChange, periodFrom, periodRange, winRate } from "./dashboard";
import type { Permission } from "./rbac";

// Run as if the server were in UTC (Vercel's default), so the tests prove the periods follow Asia/Karachi
process.env.TZ = "UTC";

describe("periodRange", () => {
  // 12 Nov 2026, 10:00 in Karachi
  const now = new Date("2026-11-12T05:00:00Z");

  it("starts the month at midnight in Karachi, not UTC", () => {
    const r = periodRange("month", now);
    expect(r.start.toISOString()).toBe("2026-10-31T19:00:00.000Z");
    expect(r.previousStart.toISOString()).toBe("2026-09-30T19:00:00.000Z");
    expect(r.current).toEqual({ year: 2026, month: 10, quarter: 4 });
    expect(r.previous).toEqual({ year: 2026, month: 9, quarter: 4 });
  });

  it("compares with the same point of the previous period", () => {
    const r = periodRange("month", now);
    // 11 days and 15 hours into November → 11 days and 15 hours into October
    expect(r.previousEnd.toISOString()).toBe("2026-10-12T05:00:00.000Z");
  });

  it("never lets the previous stretch run into the current period", () => {
    // 31 March: February is shorter, so its stretch stops at 1 March
    const r = periodRange("month", new Date("2026-03-31T12:00:00Z"));
    expect(r.previousEnd.getTime()).toBe(r.start.getTime());
  });

  it("quarters start in Jan, Apr, Jul and Oct", () => {
    const r = periodRange("quarter", now);
    expect(r.start.toISOString()).toBe("2026-09-30T19:00:00.000Z");
    expect(r.previousStart.toISOString()).toBe("2026-06-30T19:00:00.000Z");
    expect(r.previous.quarter).toBe(3);
  });

  it("the first quarter compares with the last quarter of the year before", () => {
    const r = periodRange("quarter", new Date("2026-02-10T12:00:00Z"));
    expect(r.previous).toEqual({ year: 2025, month: 9, quarter: 4 });
  });

  it("years start on 1 January in Karachi", () => {
    const r = periodRange("year", now);
    expect(r.start.toISOString()).toBe("2025-12-31T19:00:00.000Z");
    expect(r.previous.year).toBe(2025);
  });

  it("a UTC evening on the last day of the month is already the next month in Karachi", () => {
    const r = periodRange("month", new Date("2026-11-30T20:00:00Z"));
    expect(r.current.month).toBe(11);
  });

  it("unknown ?period= values fall back to the month", () => {
    expect(periodFrom(undefined)).toBe("month");
    expect(periodFrom("decade")).toBe("month");
    expect(periodFrom("year")).toBe("year");
  });
});

describe("percentChange", () => {
  it("rounds to whole percent, up and down", () => {
    expect(percentChange(112, 100)).toBe(12);
    expect(percentChange(50, 200)).toBe(-75);
    expect(percentChange(100, 100)).toBe(0);
  });

  it("has nothing to say when the previous period was empty", () => {
    expect(percentChange(500, 0)).toBeNull();
  });
});

describe("winRate", () => {
  it("is hidden under five closed leads", () => {
    expect(winRate(1, 0)).toEqual({ won: 1, closed: 1, rate: null });
    expect(winRate(3, 1).rate).toBeNull();
  });

  it("shows from five closed leads", () => {
    expect(winRate(4, 1)).toEqual({ won: 4, closed: 5, rate: 80 });
    expect(winRate(10, 2).rate).toBe(83);
  });
});

describe("days", () => {
  it("counts calendar days in Karachi", () => {
    // 12 Nov 22:00 in Karachi
    const now = new Date("2026-11-12T17:00:00Z");
    expect(daysUntil("2026-11-24", now)).toBe(12);
    expect(daysUntil("2026-11-12", now)).toBe(0);
    expect(daysUntil("2026-11-10", now)).toBe(-2);
    // 13 Nov 00:30 in Karachi: a day less to go
    expect(daysUntil("2026-11-24", new Date("2026-11-12T19:30:00Z"))).toBe(11);
  });

  it("days since never goes negative", () => {
    const now = new Date("2026-11-12T12:00:00Z");
    expect(daysSince(new Date("2026-11-09T11:00:00Z"), now)).toBe(3);
    expect(daysSince(new Date("2026-11-13T00:00:00Z"), now)).toBe(0);
  });
});

describe("attentionCards", () => {
  const as = (...permissions: Permission[]) => attentionCards({ permissions });

  it("an admin gets the reviewer's version of every card", () => {
    expect(
      as(
        "kyc:review",
        "kyc:submit",
        "payments:record",
        "policies:issue",
        "leads:assign",
        "quotes:create",
        "policies:view",
      ),
    ).toEqual(["kycReview", "paymentsToRecord", "unassigned", "renewals"]);
  });

  it("an advisor gets their own tasks", () => {
    expect(as("kyc:submit", "policies:issue", "quotes:create", "policies:view")).toEqual([
      "kycToSend",
      "paidToBook",
      "toQuote",
      "renewals",
    ]);
  });

  it("finance and compliance only see what they can act on", () => {
    expect(as("payments:record", "policies:view")).toEqual(["paymentsToRecord", "renewals"]);
    expect(as("kyc:review", "policies:view")).toEqual(["kycReview", "renewals"]);
  });

  it("a coordinator only assigns", () => {
    expect(as("leads:assign")).toEqual(["unassigned"]);
  });
});
