import { describe, expect, it } from "vitest";
import { dateTime, shortDate } from "./format";

// Run as if the server were in UTC (Vercel's default), so the test proves the time zone comes from the config
process.env.TZ = "UTC";

describe("dates use the app's time zone (Asia/Karachi)", () => {
  it("a UTC timestamp at 20:00 on 11 Nov formats as 12 Nov", () => {
    expect(shortDate("2026-11-11T20:00:00Z")).toBe("12 Nov 2026");
    expect(dateTime(new Date("2026-11-11T20:00:00Z"))).toBe("12 Nov 2026, 01:00");
  });

  it("18:59 UTC is still the same day in Karachi", () => {
    expect(shortDate(new Date("2026-11-11T18:59:00Z"))).toBe("11 Nov 2026");
  });
});
