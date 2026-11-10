import { Icon } from "@/components/ui";
import { cn } from "@/lib/cn";

export type RailStep = { label: string; detail: string; done: boolean };

/** The case's steps from quote to payment. The first unfinished step is highlighted. */
export function ProgressRail({ steps }: { steps: RailStep[] }) {
  const current = steps.findIndex((s) => !s.done);
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {steps.map((step, i) => (
        <li
          key={step.label}
          aria-current={i === current ? "step" : undefined}
          className={cn(
            "flex min-w-0 items-start gap-3 rounded-lg border px-3 py-2.5",
            step.done
              ? "border-brand/25 bg-brand-soft"
              : i === current
                ? "border-ink bg-white"
                : "border-line bg-white/60",
          )}
        >
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
        </li>
      ))}
    </ol>
  );
}
