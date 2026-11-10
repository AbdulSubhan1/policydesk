import { cn } from "@/lib/cn";

/** Round choice; the checked state is a thick brand ring. Label it with aria-label when it sits in a table. */
export function Radio({ className, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <input
      data-ui="Radio"
      type="radio"
      className={cn(
        "h-[18px] w-[18px] cursor-pointer appearance-none rounded-full border border-ink/25 bg-white align-middle transition-all checked:border-[5px] checked:border-brand hover:border-brand/60 focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:outline-none disabled:cursor-default disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
