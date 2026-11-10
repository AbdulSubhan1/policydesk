import { cn } from "@/lib/cn";

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-ui="CardBody" className={cn("px-5 py-4", className)} {...props} />;
}
