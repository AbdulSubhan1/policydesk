import "server-only";
import { after } from "next/server";

// Pulse is my small monitor (github.com/AbdulSubhan1/monitor). PolicyDesk sends it security events (logins) with its
// own token. Pulse stores the account and IP only as keyed hashes. Off until MONITOR_LOG_TOKEN is set, and it can never
// break a login: sent after the response (the visitor never waits), failures only logged.

export const PULSE_URL = "https://abdulsubhan-pulse.vercel.app";
// Generous because nobody waits for it: a cold Pulse plus a sleeping free database can take a few seconds, and a
// 2-second limit silently dropped real events
const TIMEOUT_MS = 10_000;

export type SecurityEvent = {
  type: "login_failed" | "login_succeeded" | "login_blocked" | "action_blocked";
  account?: string;
  ip?: string;
  path?: string;
  // snake_case reason, never free text: "wrong_password", "unknown_account", "inactive", "rate_limited", "demo_roles"
  reason?: string;
};

async function send(event: SecurityEvent): Promise<void> {
  const token = process.env.MONITOR_LOG_TOKEN?.trim();
  if (!token) return;
  try {
    const res = await fetch(`${PULSE_URL}/api/security`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // One line in the Vercel logs, so a lost event has a visible reason (never the token or the event's data)
    if (!res.ok) console.warn(`[pulse] security event not stored: HTTP ${res.status}`);
  } catch (err) {
    console.warn(`[pulse] security event not sent: ${err instanceof Error ? err.name : "error"}`);
  }
}

export function reportSecurity(event: SecurityEvent): void {
  if (!process.env.MONITOR_LOG_TOKEN?.trim()) return;
  try {
    after(() => send(event));
  } catch {
    // Outside a request (a script or test): send it now, still without waiting
    void send(event);
  }
}
