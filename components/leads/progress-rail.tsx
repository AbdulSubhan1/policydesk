import Link from "next/link";
import { Icon } from "@/components/ui";
import { cn } from "@/lib/cn";

export type RailStep = { label: string; detail: string; done: boolean; href?: string };

/**
 * The case's steps from quote to payment; the first unfinished one is highlighted and each opens its tab. On phones
 * the steps keep their order in one row that scrolls sideways; from lg up they share the width.
 */
export function ProgressRail({ steps }: { steps: RailStep[] }) {
  const current = steps.findIndex((s) => !s.done);
  return (
    <ol className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible">
      {steps.map((step, i) => {
        const body = (
          <>
            <span
              className={cn(
                "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
                step.done ? "bg-brand text-white" : i === current ? "bg-ink text-white" : "bg-paper text-muted",
              )}
            >
              {step.done ? <Icon name="check" size={14} /> : i + 1}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-ink">{step.label}</span>
              <span className="block truncate text-xs text-muted">{step.detail}</span>
            </span>
          </>
        );
        const box = cn(
          "flex min-w-0 items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
          step.done
            ? "border-brand/25 bg-brand-soft"
            : i === current
              ? "border-ink bg-white"
              : "border-line bg-white/60",
          step.href &&
            "hover:border-ink/40 focus-visible:ring-3 focus-visible:ring-brand/25 focus-visible:outline-none",
        );
        return (
          <li
            key={step.label}
            aria-current={i === current ? "step" : undefined}
            className="w-40 shrink-0 snap-start lg:w-auto"
          >
            {step.href ? (
              <Link href={step.href} scroll={false} className={cn(box, "h-full")}>
                {body}
              </Link>
            ) : (
              <div className={cn(box, "h-full")}>{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
