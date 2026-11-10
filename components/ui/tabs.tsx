import Link from "next/link";
import { cn } from "@/lib/cn";

export type TabItem = { id: string; label: string; href: string; count?: number };

/** Underlined tab links; the active one comes from the URL. */
export function Tabs({ tabs, current, label }: { tabs: TabItem[]; current: string; label: string }) {
  return (
    <nav data-ui="Tabs" className="flex gap-1 overflow-x-auto border-b border-line px-2" aria-label={label}>
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          scroll={false}
          aria-current={tab.id === current ? "page" : undefined}
          className={cn(
            "-mb-px shrink-0 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap",
            tab.id === current ? "border-brand text-ink" : "border-transparent text-muted hover:text-ink",
          )}
        >
          {tab.label}
          {tab.count !== undefined && <span className="ms-1.5 text-xs text-muted">{tab.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
