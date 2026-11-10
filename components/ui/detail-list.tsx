import { cn } from "@/lib/cn";

const COLUMNS = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" } as const;

/** Label and value pairs in a responsive grid. Empty values show a dash. */
export function DetailList({
  items,
  columns = 1,
}: {
  items: { label: string; value: React.ReactNode }[];
  columns?: keyof typeof COLUMNS;
}) {
  return (
    <dl data-ui="DetailList" className={cn("grid grid-cols-1 gap-x-6 gap-y-3 text-sm", COLUMNS[columns])}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs text-muted">{item.label}</dt>
          <dd className="mt-0.5 [overflow-wrap:anywhere] text-ink">{item.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
