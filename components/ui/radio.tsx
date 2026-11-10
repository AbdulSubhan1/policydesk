import { cn } from "@/lib/cn";

// The checked state is a thick brand ring, so the dot stays centred at every size
const SIZES = {
  sm: "h-4 w-4 checked:border-[4px]",
  md: "h-[18px] w-[18px] checked:border-[5px]",
  lg: "h-[22px] w-[22px] checked:border-[6px]",
} as const;

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & { size?: keyof typeof SIZES };

/** Round choice. Label it with aria-label when it sits in a table. */
export function Radio({ size = "md", className, ...props }: Props) {
  return (
    <input
      data-ui="Radio"
      type="radio"
      className={cn(
        "m-0 cursor-pointer appearance-none rounded-full border border-ink/25 bg-white align-middle transition-all outline-none checked:border-brand hover:border-brand/60 focus-visible:ring-3 focus-visible:ring-brand/25 disabled:cursor-default disabled:opacity-60",
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
