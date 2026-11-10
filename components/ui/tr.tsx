import { cn } from "@/lib/cn";

export function Tr({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr data-ui="Tr" className={cn("hover:bg-paper/60", className)} {...props} />;
}
