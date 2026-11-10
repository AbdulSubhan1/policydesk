import { cn } from "@/lib/cn";
import { Icon } from "./icon";

/** Checkbox with its label; the whole row is clickable. */
export function Checkbox({
  label,
  hint,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string; hint?: string }) {
  return (
    <label
      data-ui="Checkbox"
      className={cn(
        "group flex min-w-0 items-start gap-2.5 text-sm text-ink",
        props.disabled ? "opacity-60" : "cursor-pointer",
        className,
      )}
    >
      <span className="relative mt-0.5 grid shrink-0 place-items-center">
        <input
          type="checkbox"
          className="peer h-[18px] w-[18px] cursor-[inherit] appearance-none rounded-[5px] border border-ink/25 bg-white transition-colors group-hover:border-brand/60 checked:border-brand checked:bg-brand focus-visible:ring-3 focus-visible:ring-brand/25 focus-visible:outline-none"
          {...props}
        />
        <Icon
          name="check"
          size={13}
          className="pointer-events-none absolute text-white opacity-0 peer-checked:opacity-100"
        />
      </span>
      <span className="min-w-0">
        {label}
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}
