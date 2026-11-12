import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

// The token helpers and payLinkState are pure; stub the database so importing the module never opens one
vi.mock("@/server/db", async () => ({ db: {}, schema: await import("@/server/db/schema") }));

const { hashPayToken, newPayToken, payLinkExpiry, payLinkState } = await import("./pay-links");

const HOUR = 3_600_000;
const created = new Date("2026-11-12T10:00:00Z");
const link = (revokedAt: Date | null = null) => ({ expiresAt: payLinkExpiry(created), revokedAt });
const later = (hours: number) => new Date(created.getTime() + hours * HOUR);

describe("pay tokens", () => {
  it("are 43 base64url characters, different every time", () => {
    const a = newPayToken();
    const b = newPayToken();
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.token).not.toBe(b.token);
  });

  it("hash is sha256 hex and never the token", () => {
    const { token, hash } = newPayToken();
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(createHash("sha256").update(token).digest("hex"));
    expect(hash).not.toContain(token);
    expect(hashPayToken(token)).toBe(hash);
  });
});

describe("payLinkState", () => {
  it("active within 72 h", () => {
    expect(payLinkState(link(), null, later(1))).toBe("active");
    expect(payLinkState(link(), { status: "pending" }, later(71.9))).toBe("active");
  });

  it("expired after 72 h", () => {
    expect(payLinkExpiry(created).getTime() - created.getTime()).toBe(72 * HOUR);
    expect(payLinkState(link(), null, later(72))).toBe("expired");
    expect(payLinkState(link(), { status: "expired" }, later(100))).toBe("expired");
  });

  it("revoked wins over active", () => {
    expect(payLinkState(link(later(1)), null, later(2))).toBe("revoked");
  });

  it("paid when the lead's order is paid", () => {
    expect(payLinkState(link(), { status: "paid" }, later(2))).toBe("paid");
    // A paid customer who opens the link days later still gets the thank-you page
    expect(payLinkState(link(), { status: "paid" }, later(200))).toBe("paid");
  });

  it("revoked wins over paid, so an old link gives nothing away", () => {
    expect(payLinkState(link(later(1)), { status: "paid" }, later(2))).toBe("revoked");
  });
});
