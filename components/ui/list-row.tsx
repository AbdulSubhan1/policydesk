import { cn } from "@/lib/cn";

/** One row of a divided list inside a card: content at the start, an action at the end. */
export function ListRow({
  children,
  action,
  muted,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <li
      data-ui="ListRow"
      className={cn(
        "flex items-center justify-between gap-3 border-b border-line px-5 py-3 last:border-b-0",
        muted && "opacity-60",
      )}
    >
      <div className="min-w-0">{children}</div>
      {action}
    </li>
  );
}
