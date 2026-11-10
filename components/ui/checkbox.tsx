import { cn } from "@/lib/cn";
import { Icon } from "./icon";

const SIZES = {
  sm: { box: "h-4 w-4 rounded-[4px]", icon: 11, text: "text-xs" },
  md: { box: "h-[18px] w-[18px] rounded-[5px]", icon: 13, text: "text-sm" },
  lg: { box: "h-[22px] w-[22px] rounded-md", icon: 16, text: "text-base" },
} as const;

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
  label: string;
  hint?: string;
  size?: keyof typeof SIZES;
  /** Keep the label for screen readers only, e.g. a row checkbox in a table. */
  hideLabel?: boolean;
};

/** Checkbox with its label; the whole row is clickable. */
export function Checkbox({ label, hint, size = "md", hideLabel, className, ...props }: Props) {
  const s = SIZES[size];
  return (
    <label
      data-ui="Checkbox"
      className={cn(
        "group flex min-w-0 items-start gap-2.5 text-ink",
        s.text,
        props.disabled ? "opacity-60" : "cursor-pointer",
        className,
      )}
    >
      {/* The input is the box; the tick sits exactly on top of it */}
      <span className="relative mt-px inline-flex shrink-0">
        <input
          type="checkbox"
          className={cn(
            "peer m-0 block cursor-[inherit] appearance-none border border-ink/25 bg-white transition-colors outline-none group-hover:border-brand/60 checked:border-brand checked:bg-brand focus-visible:ring-3 focus-visible:ring-brand/25",
            s.box,
          )}
          {...props}
        />
        <Icon
          name="check"
          size={s.icon}
          className="pointer-events-none absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100"
        />
      </span>
      <span className={hideLabel ? "sr-only" : "min-w-0 leading-5"}>
        {label}
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}
