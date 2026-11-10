import { cn } from "@/lib/cn";

export function Radio({ className, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  return <input data-ui="Radio" type="radio" className={cn("h-4 w-4 accent-brand", className)} {...props} />;
}
