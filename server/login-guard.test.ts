import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/pulse", () => ({ reportSecurity: vi.fn() }));

const { MAX_FAILURES, WINDOW_MS, ipFrom, isBlocked, noteBlocked, noteFailure, noteSuccess, resetLoginGuard } =
  await import("./login-guard");
const { reportSecurity } = await import("@/server/pulse");
const report = vi.mocked(reportSecurity);

const NOW = 1_800_000_000_000;

beforeEach(() => resetLoginGuard());
afterEach(() => report.mockReset());

describe("login guard", () => {
  it("blocks an address after 10 failures in 15 minutes, and lets it back after the window", () => {
    for (let i = 0; i < MAX_FAILURES; i++) {
      expect(isBlocked("203.0.113.9", NOW + i)).toBe(false);
      noteFailure("203.0.113.9", `user${i}@example.com`, "wrong_password", NOW + i);
    }
    expect(isBlocked("203.0.113.9", NOW + 20)).toBe(true);
    expect(isBlocked("198.51.100.7", NOW + 20)).toBe(false);
    expect(isBlocked("203.0.113.9", NOW + WINDOW_MS + 10)).toBe(false);
  });

  it("reports the first 10 failures and then a single block, however long the attack runs", () => {
    for (let i = 0; i < 1000; i++) {
      if (isBlocked("203.0.113.9", NOW + i)) noteBlocked("203.0.113.9", NOW + i);
      else noteFailure("203.0.113.9", "admin@policydesk.dev", "wrong_password", NOW + i);
    }
    expect(report).toHaveBeenCalledTimes(MAX_FAILURES + 1);
    expect(report).toHaveBeenLastCalledWith({
      type: "login_blocked",
      ip: "203.0.113.9",
      reason: "rate_limited",
      path: "/login",
    });
  });

  it("reports a success with the account, and never the password", () => {
    noteSuccess("198.51.100.7", "admin@policydesk.dev");
    expect(report).toHaveBeenCalledWith({
      type: "login_succeeded",
      account: "admin@policydesk.dev",
      ip: "198.51.100.7",
      path: "/login",
    });
  });

  it("reads the visitor's address from the first x-forwarded-for entry", () => {
    expect(ipFrom(new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }))).toBe("203.0.113.9");
    expect(ipFrom(new Headers({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
    expect(ipFrom(new Headers())).toBe("unknown");
  });
});
