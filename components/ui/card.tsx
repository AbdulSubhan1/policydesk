import { cn } from "@/lib/cn";
import { surface } from "./styles";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-ui="Card" className={cn(surface, className)} {...props} />;
}
