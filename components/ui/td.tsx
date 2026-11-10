import { cn } from "@/lib/cn";

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td data-ui="Td" className={cn("border-b border-line px-4 py-3 align-middle", className)} {...props} />;
}
