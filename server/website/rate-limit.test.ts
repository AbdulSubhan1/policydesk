import { describe, expect, it, vi } from "vitest";
import { CLIENT_IP_HEADER, RATE_LIMITS_PER_HOUR } from "@/constants/config";

// The helpers are pure; consume runs against an in-memory Postgres so the upsert and the window key are real SQL
vi.mock("@/server/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const schema = await import("@/server/db/schema");
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  return { db, schema };
});

const { clientIp, consume, limitFor, retryAfterSeconds, windowStart } = await import("./rate-limit");
const { db, schema } = await import("@/server/db");

const at = (iso: string) => new Date(iso);
const withIp = (ip?: string) =>
  new Request("http://localhost/api/website/v1/opportunities", {
    headers: ip === undefined ? {} : { [CLIENT_IP_HEADER]: ip },
  });

describe("limitFor", () => {
  it("reads env and defaults", () => {
    expect(limitFor("lead", {})).toBe(5);
    expect(limitFor("select", {})).toBe(30);
    expect(limitFor("pay", {})).toBe(20);
    expect(limitFor("link", {})).toBe(20);
    expect(limitFor("read", {})).toBe(600);
    expect(limitFor("lead", {})).toBe(RATE_LIMITS_PER_HOUR.lead);

    expect(limitFor("lead", { RATE_LIMIT_LEADS_PER_HOUR: "12" })).toBe(12);
    expect(limitFor("select", { RATE_LIMIT_SELECTIONS_PER_HOUR: "7" })).toBe(7);
    expect(limitFor("pay", { RATE_LIMIT_PAYMENTS_PER_HOUR: "3" })).toBe(3);
    expect(limitFor("link", { RATE_LIMIT_LINK_OPENS_PER_HOUR: "4" })).toBe(4);
    expect(limitFor("read", { RATE_LIMIT_READS_PER_HOUR: "1000" })).toBe(1000);
  });

  it("ignores a value that is not a positive whole number", () => {
    for (const value of ["", "abc", "0", "-3", "2.5"]) {
      expect(limitFor("lead", { RATE_LIMIT_LEADS_PER_HOUR: value })).toBe(5);
    }
  });

  it("RATE_LIMITS=off disables all", () => {
    const env = { RATE_LIMITS: "off", RATE_LIMIT_LEADS_PER_HOUR: "12" };
    for (const group of ["lead", "select", "pay", "link", "read"] as const) expect(limitFor(group, env)).toBeNull();
  });
});

describe("window", () => {
  it("windowStart is the UTC hour", () => {
    expect(windowStart(at("2026-11-12T10:42:17.123Z"))).toEqual(at("2026-11-12T10:00:00.000Z"));
    expect(windowStart(at("2026-11-12T10:00:00.000Z"))).toEqual(at("2026-11-12T10:00:00.000Z"));
    expect(windowStart(at("2026-11-12T23:59:59.999Z"))).toEqual(at("2026-11-12T23:00:00.000Z"));
  });

  it("retryAfter counts to the next hour", () => {
    expect(retryAfterSeconds(at("2026-11-12T10:00:00.000Z"))).toBe(3600);
    expect(retryAfterSeconds(at("2026-11-12T10:42:00.000Z"))).toBe(18 * 60);
    // Rounded up, so a client that waits exactly this long lands in the next window
    expect(retryAfterSeconds(at("2026-11-12T10:59:59.500Z"))).toBe(1);
  });
});

describe("clientIp", () => {
  it("takes a valid header and falls back to unknown", () => {
    expect(clientIp(withIp("203.0.113.7"))).toBe("203.0.113.7");
    expect(clientIp(withIp(" 203.0.113.7 "))).toBe("203.0.113.7");
    expect(clientIp(withIp("2001:DB8::1"))).toBe("2001:db8::1");
    expect(clientIp(withIp())).toBe("unknown");
    expect(clientIp(withIp(""))).toBe("unknown");
    expect(clientIp(withIp("not-an-ip"))).toBe("unknown");
    expect(clientIp(withIp("203.0.113.7, 10.0.0.1"))).toBe("unknown");
    expect(clientIp(withIp("999.1.1.1"))).toBe("unknown");
  });
});

describe("consume", () => {
  // Limits read process.env; the defaults apply in the test run
  const hour = at("2026-11-12T10:15:00Z");

  it("allows up to the limit, then refuses with the seconds to the window end", async () => {
    for (let i = 0; i < 5; i++) expect(await consume("lead", "198.51.100.1", hour)).toEqual({ ok: true });
    expect(await consume("lead", "198.51.100.1", hour)).toEqual({ ok: false, retryAfter: 45 * 60 });
  });

  it("counts each IP and group separately", async () => {
    for (let i = 0; i < 6; i++) await consume("lead", "198.51.100.2", hour);
    expect(await consume("lead", "198.51.100.3", hour)).toEqual({ ok: true });
    expect(await consume("read", "198.51.100.2", hour)).toEqual({ ok: true });
  });

  it("a count from the previous hour does not block the next hour", async () => {
    for (let i = 0; i < 6; i++) await consume("lead", "198.51.100.4", hour);
    expect(await consume("lead", "198.51.100.4", at("2026-11-12T10:59:59Z"))).toMatchObject({ ok: false });
    expect(await consume("lead", "198.51.100.4", at("2026-11-12T11:00:00Z"))).toEqual({ ok: true });
  });

  it("now and then deletes windows older than a day", async () => {
    await consume("lead", "198.51.100.5", at("2026-11-10T09:00:00Z"));
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      await consume("lead", "198.51.100.6", hour);
    } finally {
      random.mockRestore();
    }
    const keys = (await db.select().from(schema.rateLimits)).map((r) => r.key);
    expect(keys).not.toContain("lead:198.51.100.5");
    expect(keys).toContain("lead:198.51.100.6");
  });
});
