import Link from "next/link";
import { cn } from "@/lib/cn";

export type TabItem = { id: string; label: string; href: string; count?: number };

/** Underlined tab links; the active one comes from the URL. */
export function Tabs({ tabs, current, label }: { tabs: TabItem[]; current: string; label: string }) {
  return (
    <nav
      data-ui="Tabs"
      className="flex gap-1 overflow-x-auto overflow-y-hidden px-2 shadow-[inset_0_-1px_0] shadow-line"
      aria-label={label}
    >
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          scroll={false}
          aria-current={tab.id === current ? "page" : undefined}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap focus-visible:bg-paper focus-visible:outline-none",
            tab.id === current ? "border-brand text-ink" : "border-transparent text-muted hover:text-ink",
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                "rounded-full px-1.5 text-xs leading-5 tabular-nums",
                tab.id === current ? "bg-brand-soft text-brand-strong" : "bg-ink/5 text-muted",
              )}
            >
              {tab.count}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
