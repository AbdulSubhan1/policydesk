import Link from "next/link";
import { cn } from "@/lib/cn";
import { MotionHighlight } from "./motion-highlight";

export type PillItem = { href: string; label: string; active: boolean };

/**
 * A row of pill links (filters, product pickers). A highlight glides to the hovered pill. Scrolls sideways on small
 * screens. `variant="segment"` is a compact switch on a grey track, e.g. the dashboard's period.
 */
export function PillNav({
  items,
  label,
  variant = "pills",
}: {
  items: PillItem[];
  label: string;
  variant?: "pills" | "segment";
}) {
  if (variant === "segment") {
    return (
      <nav
        data-ui="PillNav"
        aria-label={label}
        className="inline-flex max-w-full overflow-x-auto rounded-lg bg-ink/5 p-1"
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            scroll={false}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-brand/25 focus-visible:outline-none",
              item.active ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <nav data-ui="PillNav" className="-mx-4 mb-4 overflow-x-auto px-4 md:mx-0 md:px-0" aria-label={label}>
      <MotionHighlight tone="white" className="flex w-max gap-1 md:w-auto md:flex-wrap">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "h-8 shrink-0 rounded-full px-3 text-sm leading-8 whitespace-nowrap",
              item.active ? "bg-ink text-white" : "text-ink-soft hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        ))}
      </MotionHighlight>
    </nav>
  );
}
