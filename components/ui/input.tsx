import { cn } from "@/lib/cn";
import { control } from "./styles";

// File inputs get a styled "choose file" button instead of the browser default
const FILE =
  "h-auto py-1.5 file:me-3 file:h-7 file:cursor-pointer file:rounded-md file:border-0 file:bg-paper file:px-3 file:text-sm file:font-medium file:text-ink hover:file:bg-line";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input data-ui="Input" className={cn(control, props.type === "file" && FILE, className)} {...props} />;
}
