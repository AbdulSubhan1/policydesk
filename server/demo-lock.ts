import "server-only";
import { headers } from "next/headers";
import { ipFrom } from "@/server/login-guard";
import { reportSecurity } from "@/server/pulse";
import { isDemoMode } from "@/server/settings";

// What the live demo locks while `demo_mode` is on (switched only in the database, see RUNBOOK.md). Everyone is
// refused, the demo Admin too, because the demo passwords are public. Screens still open, read-only.
export const DEMO_LOCKS = [
  "roles",
  "users",
  "settings",
  "catalogue",
  "uploads",
  "document_delete",
  "pay_links",
] as const;
export type DemoLock = (typeof DEMO_LOCKS)[number];

export const DEMO_LOCKED_ERROR = "errors.demoLocked";

/** True while demo mode is on; pages use it to show the screen read-only. */
export function isDemoLocked(): Promise<boolean> {
  return isDemoMode();
}

/**
 * For actions that return an ActionResult: the error key when the action is locked (and the attempt is reported to
 * Pulse), otherwise null.
 */
export async function demoLockError(lock: DemoLock, account: string, path: string): Promise<string | null> {
  if (!(await isDemoMode())) return null;
  reportSecurity({ type: "action_blocked", account, ip: ipFrom(await headers()), reason: `demo_${lock}`, path });
  return DEMO_LOCKED_ERROR;
}

/** For one-click FormData actions, which throw on misuse: the screens hide these buttons in demo mode, so only a forged request gets here. */
export async function assertNotDemoLocked(lock: DemoLock, account: string, path: string): Promise<void> {
  const error = await demoLockError(lock, account, path);
  if (error) throw new Error(error);
}
