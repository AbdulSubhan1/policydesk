import "server-only";
import { reportSecurity } from "@/server/pulse";

// Stops password guessing on the login form and reports it to Pulse, without writing to our own database.
// After 10 failed logins from one address in 15 minutes, that address is refused without a password check (even the
// right password) until the window passes. Counts live in memory, per server instance: Vercel reuses warm instances,
// so this cuts a guessing run to a trickle; Pulse's rules catch what spreads across instances or addresses.
// Accounts are not locked: an attacker could otherwise lock real users out on purpose.

export const MAX_FAILURES = 10;
export const WINDOW_MS = 15 * 60_000;
const MAX_KEYS = 10_000;

const failures = new Map<string, number[]>();
const blockReported = new Map<string, number>();

function recent(ip: string, now: number): number[] {
  return (failures.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
}

export function isBlocked(ip: string, now = Date.now()): boolean {
  return recent(ip, now).length >= MAX_FAILURES;
}

/** Counts a failed login. The first 10 per address and window go to Pulse; after that only one "blocked" event. */
export function noteFailure(ip: string, account: string, reason: string, now = Date.now()) {
  const list = recent(ip, now);
  if (list.length < MAX_FAILURES) {
    list.push(now);
    if (!failures.has(ip) && failures.size >= MAX_KEYS) failures.delete(failures.keys().next().value!);
    failures.set(ip, list);
    reportSecurity({ type: "login_failed", account, ip, reason, path: "/login" });
  }
}

/** A refused attempt from a blocked address: reported once per window, so a flood costs Pulse one row. */
export function noteBlocked(ip: string, now = Date.now()) {
  const last = blockReported.get(ip);
  if (last !== undefined && now - last < WINDOW_MS) return;
  if (!blockReported.has(ip) && blockReported.size >= MAX_KEYS)
    blockReported.delete(blockReported.keys().next().value!);
  blockReported.set(ip, now);
  reportSecurity({ type: "login_blocked", ip, reason: "rate_limited", path: "/login" });
}

export function noteSuccess(ip: string, account: string) {
  reportSecurity({ type: "login_succeeded", account, ip, path: "/login" });
}

/** The visitor's address on Vercel (first x-forwarded-for entry); "unknown" elsewhere. */
export function ipFrom(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

/** Tests only: start from a clean slate. */
export function resetLoginGuard() {
  failures.clear();
  blockReported.clear();
}
