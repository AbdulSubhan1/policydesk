import { TIME_ZONE } from "@/constants/config";
import { can, type SessionUser } from "./rbac";

/** The dashboard's period switch (?period=). The first one is the default. */
export const PERIODS = ["month", "quarter", "year"] as const;
export type Period = (typeof PERIODS)[number];

/** Win rate is hidden until this many leads have closed in the period: one sale is not a 100% rate. */
export const MIN_CLOSED_FOR_WIN_RATE = 5;

/** A renewal ending within this many days gets the amber badge; later ones are blue. */
export const RENEWAL_SOON_DAYS = 14;

const DAY = 86_400_000;

export function periodFrom(value: string | undefined): Period {
  return PERIODS.find((p) => p === value) ?? PERIODS[0];
}

/** The calendar date and time of an instant in `timeZone`, as numbers (month 0-based). */
function zonedParts(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)!.value);
  return { year: get("year"), month: get("month") - 1, day: get("day"), hour: get("hour"), minute: get("minute") };
}

/** Midnight at the start of a calendar day in `timeZone`, as an instant. */
function zonedMidnight(year: number, month: number, day: number, timeZone: string) {
  const guess = Date.UTC(year, month, day);
  const p = zonedParts(new Date(guess), timeZone);
  const offset = Date.UTC(p.year, p.month, p.day, p.hour, p.minute) - guess;
  return new Date(guess - offset);
}

export type PeriodRange = {
  /** Start of the current month, quarter or year in the app's time zone. */
  start: Date;
  /** Start of the period before it. */
  previousStart: Date;
  /** The same point in the previous period, so a half-finished month is compared with half of the last one. */
  previousEnd: Date;
  /** For labels: the previous period's year, month (0-11) and quarter (1-4). */
  previous: { year: number; month: number; quarter: number };
  /** The current period's year, month (0-11) and quarter (1-4). */
  current: { year: number; month: number; quarter: number };
};

/** The current period up to `now`, and the matching stretch of the previous one. */
export function periodRange(period: Period, now: Date, timeZone = TIME_ZONE): PeriodRange {
  const { year, month } = zonedParts(now, timeZone);
  const startMonth = period === "month" ? month : period === "quarter" ? month - (month % 3) : 0;
  const length = period === "month" ? 1 : period === "quarter" ? 3 : 12;

  const start = zonedMidnight(year, startMonth, 1, timeZone);
  // Date.UTC rolls month -1 back into the previous year
  const previousStart = zonedMidnight(year, startMonth - length, 1, timeZone);
  const previousEnd = new Date(Math.min(previousStart.getTime() + (now.getTime() - start.getTime()), start.getTime()));
  const prev = new Date(Date.UTC(year, startMonth - length, 1));
  const describe = (y: number, m: number) => ({ year: y, month: m, quarter: Math.floor(m / 3) + 1 });

  return {
    start,
    previousStart,
    previousEnd,
    current: describe(year, startMonth),
    previous: describe(prev.getUTCFullYear(), prev.getUTCMonth()),
  };
}

/** Whole-percent change from `previous` to `current`; null when there is nothing to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** "N won of M closed", with the rate only once enough leads have closed. */
export function winRate(won: number, lost: number, minimum = MIN_CLOSED_FOR_WIN_RATE) {
  const closed = won + lost;
  return { won, closed, rate: closed >= minimum ? Math.round((won / closed) * 100) : null };
}

/** Calendar days from today (in the app's time zone) to a YYYY-MM-DD date; negative once it has passed. */
export function daysUntil(date: string, now: Date, timeZone = TIME_ZONE) {
  const today = zonedParts(now, timeZone);
  const [y, m, d] = date.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(today.year, today.month, today.day)) / DAY);
}

/** Whole days since an instant, e.g. how long the oldest KYC check has waited. */
export function daysSince(at: Date, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - at.getTime()) / DAY));
}

/**
 * The "Needs you today" cards for a role, in order. Each slot shows the reviewer's task when the role has it,
 * otherwise the advisor's version of it, so every role sees only work it can act on.
 */
export type AttentionCard =
  | "kycReview"
  | "kycToSend"
  | "paymentsToRecord"
  | "paidToBook"
  | "unassigned"
  | "toQuote"
  | "renewals";

export function attentionCards(user: Pick<SessionUser, "permissions">): AttentionCard[] {
  const slots: (AttentionCard | false)[] = [
    can(user, "kyc:review") ? "kycReview" : can(user, "kyc:submit") && "kycToSend",
    can(user, "payments:record") ? "paymentsToRecord" : can(user, "policies:issue") && "paidToBook",
    can(user, "leads:assign") ? "unassigned" : can(user, "quotes:create") && "toQuote",
    can(user, "policies:view") && "renewals",
  ];
  return slots.filter((s): s is AttentionCard => !!s);
}
