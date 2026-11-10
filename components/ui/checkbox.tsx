import { cn } from "@/lib/cn";

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
        "flex min-w-0 items-start gap-2.5 text-sm text-ink",
        props.disabled ? "opacity-70" : "cursor-pointer",
        className,
      )}
    >
      <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-brand" {...props} />
      <span className="min-w-0">
        {label}
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}
