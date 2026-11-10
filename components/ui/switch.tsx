import { cn } from "@/lib/cn";

const SIZES = {
  sm: { track: "h-5 w-9", thumb: "h-4 w-4 peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" },
  md: { track: "h-6 w-11", thumb: "h-5 w-5 peer-checked:translate-x-5 rtl:peer-checked:-translate-x-5" },
} as const;

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
  label: string;
  description?: string;
  size?: keyof typeof SIZES;
};

/** An on/off setting that applies at once, like "Plan active". For a choice that is submitted later, use Checkbox. */
export function Switch({ label, description, size = "md", className, ...props }: Props) {
  const s = SIZES[size];
  return (
    <label
      data-ui="Switch"
      className={cn(
        "flex min-w-0 items-start justify-between gap-4 text-sm",
        props.disabled ? "opacity-60" : "cursor-pointer",
        className,
      )}
    >
      <span className="min-w-0">
        <span className="block font-medium text-ink">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" {...props} />
        <span
          className={cn(
            "rounded-full bg-ink/15 transition-colors peer-checked:bg-brand peer-focus-visible:ring-3 peer-focus-visible:ring-brand/25",
            s.track,
          )}
        />
        <span
          className={cn("absolute start-0.5 top-0.5 rounded-full bg-white shadow-sm transition-transform", s.thumb)}
        />
      </span>
    </label>
  );
}
