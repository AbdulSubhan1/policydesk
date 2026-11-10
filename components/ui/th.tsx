import { cn } from "@/lib/cn";

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      data-ui="Th"
      className={cn("border-b border-line px-4 py-2.5 text-start text-xs font-medium text-muted", className)}
      {...props}
    />
  );
}
