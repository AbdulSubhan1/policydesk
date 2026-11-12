import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// `after` runs its task at once here
let pending: Promise<unknown> = Promise.resolve();
vi.mock("next/server", () => ({ after: (task: () => Promise<unknown>) => (pending = task()) }));

const { PULSE_URL, reportSecurity } = await import("./pulse");

const fetchMock = vi.fn<typeof fetch>();
const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
const EVENT = {
  type: "login_failed" as const,
  account: "a@b.c",
  ip: "203.0.113.9",
  reason: "wrong_password",
  path: "/login",
};

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  fetchMock.mockReset();
  warn.mockClear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("reportSecurity", () => {
  it("does nothing until the token is set", async () => {
    vi.stubEnv("MONITOR_LOG_TOKEN", "");
    reportSecurity(EVENT);
    await pending;
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the event to Pulse with this app's token", async () => {
    vi.stubEnv("MONITOR_LOG_TOKEN", "policydesk.sig");
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    reportSecurity(EVENT);
    await pending;
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${PULSE_URL}/api/security`);
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer policydesk.sig");
    expect(JSON.parse(String(init?.body))).toEqual(EVENT);
    expect(warn).not.toHaveBeenCalled();
  });

  it("logs why an event was lost, without the token or the event's data", async () => {
    vi.stubEnv("MONITOR_LOG_TOKEN", "policydesk.sig");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
    reportSecurity(EVENT);
    await pending;
    fetchMock.mockRejectedValueOnce(Object.assign(new Error("aborted"), { name: "TimeoutError" }));
    reportSecurity(EVENT);
    await pending;
    expect(warn.mock.calls.map((c) => c[0])).toEqual([
      "[pulse] security event not stored: HTTP 401",
      "[pulse] security event not sent: TimeoutError",
    ]);
    expect(JSON.stringify(warn.mock.calls)).not.toMatch(/policydesk\\.sig|a@b\\.c|203\\.0\\.113/);
  });
});
