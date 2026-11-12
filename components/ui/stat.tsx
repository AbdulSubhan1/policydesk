import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";
import { surface } from "./styles";

type Props = {
  label: string;
  value: React.ReactNode;
  href?: string;
  /** A short muted line under the value, e.g. "4 new this month" or "10 won of 12 closed". */
  hint?: React.ReactNode;
  /** Change against an earlier period in whole percent, e.g. { value: 12, label: "vs same point in October" }. */
  delta?: { value: number; label: string };
  /** A badge beside the value, e.g. "Oldest 3 days". */
  badge?: React.ReactNode;
  /** What the link does, shown at the bottom when `href` is set, e.g. "Review now". */
  action?: string;
};

const SIGN = (n: number) => (n > 0 ? `+${n}%` : n < 0 ? `−${Math.abs(n)}%` : "0%");

/** A headline number with its label; becomes a link when `href` is set. */
export function Stat({ label, value, href, hint, delta, badge, action }: Props) {
  const className = cn(surface, "flex flex-col px-4 py-3.5", href && "hover:border-ink/30");
  const body = (
    <>
      <span className="block truncate text-sm text-muted">{label}</span>
      <span className="mt-1 flex min-w-0 items-center justify-between gap-2">
        <span className="truncate text-2xl font-semibold tracking-tight text-ink tabular-nums">{value}</span>
        {badge}
      </span>
      {delta && (
        <span
          className={cn(
            "mt-1 block truncate text-xs font-medium",
            delta.value > 0 ? "text-brand-strong" : delta.value < 0 ? "text-risk" : "text-muted",
          )}
        >
          {SIGN(delta.value)} {delta.label}
        </span>
      )}
      {hint && <span className="mt-1 block truncate text-xs text-muted">{hint}</span>}
      {href && action && (
        <span className="mt-auto flex items-center gap-1 pt-2 text-sm font-medium text-brand">
          {action}
          <Icon name="chevronEnd" size={14} className="rtl:rotate-180" />
        </span>
      )}
    </>
  );
  return href ? (
    <Link data-ui="Stat" href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div data-ui="Stat" className={className}>
      {body}
    </div>
  );
}
