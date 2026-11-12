import { isIP } from "node:net";
import { lt, sql } from "drizzle-orm";
import { CLIENT_IP_HEADER, RATE_LIMITS_PER_HOUR } from "@/constants/config";
import { db, schema } from "@/server/db";

// Per-visitor-IP limits on the website API, counted in Postgres in fixed UTC-hour windows

export type LimitGroup = keyof typeof RATE_LIMITS_PER_HOUR;

const LIMIT_ENV: Record<LimitGroup, string> = {
  lead: "RATE_LIMIT_LEADS_PER_HOUR",
  select: "RATE_LIMIT_SELECTIONS_PER_HOUR",
  pay: "RATE_LIMIT_PAYMENTS_PER_HOUR",
  link: "RATE_LIMIT_LINK_OPENS_PER_HOUR",
  read: "RATE_LIMIT_READS_PER_HOUR",
};

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
/** Old windows are swept on roughly 1 call in this many, so no cron is needed. */
const SWEEP_EVERY = 50;

/** Calls allowed per IP per hour for the group, or null when RATE_LIMITS=off. A bad env value keeps the default. */
export function limitFor(group: LimitGroup, env: Record<string, string | undefined> = process.env): number | null {
  if (env.RATE_LIMITS === "off") return null;
  const value = Number(env[LIMIT_ENV[group]] || NaN);
  return Number.isInteger(value) && value > 0 ? value : RATE_LIMITS_PER_HOUR[group];
}

export function windowStart(now: Date): Date {
  return new Date(Math.floor(now.getTime() / HOUR_MS) * HOUR_MS);
}

export function retryAfterSeconds(now: Date): number {
  return Math.ceil((windowStart(now).getTime() + HOUR_MS - now.getTime()) / 1000);
}

/** The visitor IP the website sent. Anything that is not one IP address shares the "unknown" bucket. */
export function clientIp(req: Request): string {
  const ip = req.headers.get(CLIENT_IP_HEADER)?.trim().toLowerCase() ?? "";
  return isIP(ip) ? ip : "unknown";
}

/** Counts one call; refuses it once the IP has used up the group's limit for this hour. */
export async function consume(
  group: LimitGroup,
  ip: string,
  now = new Date(),
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const limit = limitFor(group);
  if (limit === null) return { ok: true };

  const { rateLimits } = schema;
  const [row] = await db
    .insert(rateLimits)
    .values({ key: `${group}:${ip}`, windowStart: windowStart(now), count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });

  if (Math.random() < 1 / SWEEP_EVERY) {
    await db.delete(rateLimits).where(lt(rateLimits.windowStart, new Date(now.getTime() - DAY_MS)));
  }
  return row.count > limit ? { ok: false, retryAfter: retryAfterSeconds(now) } : { ok: true };
}
