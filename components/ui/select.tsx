import { cn } from "@/lib/cn";
import { control } from "./styles";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select data-ui="Select" className={cn(control, "pe-8", className)} {...props} />;
}
