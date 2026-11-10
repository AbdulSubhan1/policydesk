import { cn } from "@/lib/cn";
import { control } from "./styles";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea data-ui="Textarea" className={cn(control, "h-auto min-h-20 py-2", className)} {...props} />;
}
