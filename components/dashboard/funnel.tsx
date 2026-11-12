import Link from "next/link";
import { EmptyState, Panel, Progress } from "@/components/ui";
import { cn } from "@/lib/cn";

export type FunnelStep = {
  key: string;
  label: string;
  count: number;
  /** The list behind this bar, filtered to it. */
  href?: string;
  /** neutral for plain counts; brand for wins; risk for losses; info for a breakdown such as sources. */
  tone?: "neutral" | "brand" | "risk" | "info";
};

const LABEL_TONE = {
  neutral: undefined,
  info: undefined,
  brand: "font-medium text-brand-strong",
  risk: "font-medium text-risk",
};

/** Counts as bars, each scaled to the largest; a row links to its filtered list when it has an href. */
export function Funnel({
  title,
  link,
  steps,
  note,
  empty,
}: {
  title: string;
  /** "All leads" in the corner. */
  link?: { href: string; label: string };
  steps: FunnelStep[];
  /** A line under the bars, e.g. the conversion rate. */
  note?: React.ReactNode;
  /** Shown instead of the bars when every count is zero. */
  empty: string;
}) {
  const max = Math.max(0, ...steps.map((s) => s.count));
  return (
    <Panel
      title={title}
      actions={
        link && (
          <Link href={link.href} className="text-sm font-medium text-brand hover:text-brand-strong">
            {link.label}
          </Link>
        )
      }
    >
      {max === 0 ? (
        <EmptyState title={empty} icon="dashboard" />
      ) : (
        <>
          <ul className="grid gap-3">
            {steps.map((s) => {
              const row = (
                <>
                  <span className={cn("truncate", LABEL_TONE[s.tone ?? "neutral"])}>{s.label}</span>
                  <Progress value={s.count} max={max} tone={s.tone ?? "neutral"} />
                  <span className="text-end font-medium tabular-nums">{s.count}</span>
                </>
              );
              const grid = "grid grid-cols-[minmax(0,8rem)_1fr_2.5rem] items-center gap-3 text-sm";
              return (
                <li key={s.key}>
                  {s.href ? (
                    <Link href={s.href} className={cn(grid, "hover:text-brand")}>
                      {row}
                    </Link>
                  ) : (
                    <span className={grid}>{row}</span>
                  )}
                </li>
              );
            })}
          </ul>
          {note && <p className="mt-4 text-sm text-muted">{note}</p>}
        </>
      )}
    </Panel>
  );
}
