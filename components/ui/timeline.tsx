import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

export type TimelineItem = {
  id: string | number;
  title: React.ReactNode;
  description?: React.ReactNode;
  time: string;
  icon?: IconName;
  tone?: "brand" | "info" | "warn" | "risk" | "muted";
};

const TONES = {
  brand: "bg-brand-soft text-brand-strong",
  info: "bg-info-soft text-info",
  warn: "bg-warn-soft text-warn",
  risk: "bg-risk-soft text-risk",
  muted: "bg-paper text-muted",
} as const;

/** Events in order, joined by a line: an audit trail, a policy history. Newest first is up to the caller. */
export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol data-ui="Timeline" className="grid">
      {items.map((item, i) => (
        <li key={item.id} className="relative flex min-w-0 gap-3 pb-5 last:pb-0">
          {i < items.length - 1 && <span aria-hidden className="absolute start-3.5 top-8 bottom-0 w-px bg-line" />}
          <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full", TONES[item.tone ?? "muted"])}>
            <Icon name={item.icon ?? "check"} size={14} />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3">
              <p className="min-w-0 text-sm font-medium [overflow-wrap:anywhere]">{item.title}</p>
              <time className="shrink-0 text-xs text-muted">{item.time}</time>
            </div>
            {item.description && (
              <div className="mt-0.5 text-sm [overflow-wrap:anywhere] text-ink-soft">{item.description}</div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
