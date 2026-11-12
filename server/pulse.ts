import "server-only";
import { after } from "next/server";

// Pulse is my small monitor (github.com/AbdulSubhan1/monitor). PolicyDesk sends it security events (logins) with its
// own token. Pulse stores the account and IP only as keyed hashes. Off until MONITOR_LOG_TOKEN is set, and it can never
// break a login: sent after the response, 2-second timeout, every failure ignored.

export const PULSE_URL = "https://abdulsubhan-pulse.vercel.app";
const TIMEOUT_MS = 2_000;

export type SecurityEvent = {
  type: "login_failed" | "login_succeeded" | "login_blocked";
  account?: string;
  ip?: string;
  path?: string;
  // snake_case reason, never free text: "wrong_password", "unknown_account", "inactive", "rate_limited"
  reason?: string;
};

async function send(event: SecurityEvent): Promise<void> {
  const token = process.env.MONITOR_LOG_TOKEN?.trim();
  if (!token) return;
  try {
    await fetch(`${PULSE_URL}/api/security`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // Monitoring is best effort; the login matters more
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
