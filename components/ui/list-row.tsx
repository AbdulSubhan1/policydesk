import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * One row of a divided list inside a card: content at the start, an action at the end. With `href` the content is a
 * link that fills the row, e.g. a DataTable row on a phone.
 */
export function ListRow({
  children,
  action,
  muted,
  href,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  muted?: boolean;
  href?: string;
}) {
  return (
    <li
      data-ui="ListRow"
      className={cn(
        "flex items-center justify-between gap-3 border-b border-line last:border-b-0",
        !href && "px-5 py-3",
        muted && "opacity-60",
      )}
    >
      {href ? (
        <Link
          href={href}
          className="block min-w-0 flex-1 px-4 py-3.5 hover:bg-paper/60 focus-visible:bg-paper focus-visible:outline-none"
        >
          {children}
        </Link>
      ) : (
        <div className="min-w-0 flex-1">{children}</div>
      )}
      {action}
    </li>
  );
}
