import Link from "next/link";
import { cn } from "@/lib/cn";

export type PillItem = { href: string; label: string; active: boolean };

/** A row of pill links (filters, product pickers). Scrolls sideways on small screens. */
export function PillNav({ items, label }: { items: PillItem[]; label: string }) {
  return (
    <nav
      data-ui="PillNav"
      className="-mx-4 mb-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0"
      aria-label={label}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "h-8 shrink-0 rounded-full px-3 text-sm leading-8 whitespace-nowrap",
            item.active ? "bg-ink text-white" : "text-ink-soft hover:bg-white",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
