import { cn } from "@/lib/cn";
import { control } from "./styles";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input data-ui="Input" className={cn(control, props.type === "file" && "h-auto py-1.5", className)} {...props} />
  );
}
