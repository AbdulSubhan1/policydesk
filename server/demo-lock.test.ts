import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }) }));
vi.mock("@/server/settings", () => ({ isDemoMode: vi.fn() }));
vi.mock("@/server/pulse", () => ({ reportSecurity: vi.fn() }));

const { assertNotDemoLocked, demoLockError, DEMO_LOCKED_ERROR } = await import("./demo-lock");
const { isDemoMode } = await import("@/server/settings");
const { reportSecurity } = await import("@/server/pulse");

afterEach(() => vi.mocked(reportSecurity).mockReset());

describe("demo lock", () => {
  it("lets everything through when demo mode is off", async () => {
    vi.mocked(isDemoMode).mockResolvedValue(false);
    expect(await demoLockError("roles", "admin@policydesk.dev", "/admin/roles")).toBeNull();
    await expect(assertNotDemoLocked("users", "admin@policydesk.dev", "/admin/users")).resolves.toBeUndefined();
    expect(reportSecurity).not.toHaveBeenCalled();
  });

  it("refuses a locked action in demo mode and reports it to Pulse", async () => {
    vi.mocked(isDemoMode).mockResolvedValue(true);
    expect(await demoLockError("uploads", "advisor@policydesk.dev", "/leads/7")).toBe(DEMO_LOCKED_ERROR);
    expect(reportSecurity).toHaveBeenCalledWith({
      type: "action_blocked",
      account: "advisor@policydesk.dev",
      ip: "203.0.113.9",
      reason: "demo_uploads",
      path: "/leads/7",
    });
    await expect(assertNotDemoLocked("roles", "admin@policydesk.dev", "/admin/roles")).rejects.toThrow(
      DEMO_LOCKED_ERROR,
    );
  });
});
