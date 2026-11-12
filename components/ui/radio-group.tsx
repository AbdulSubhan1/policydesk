import { cn } from "@/lib/cn";

type Option = { value: string; label: string; description?: string };

/**
 * A labelled single choice. `cards` turns each option into a bordered card for choices that need a sentence,
 * such as a payment outcome or a cover level.
 */
export function RadioGroup({
  name,
  options,
  defaultValue,
  label,
  variant = "list",
  inputProps,
  invalid,
  error,
}: {
  name: string;
  options: Option[];
  defaultValue?: string;
  label: string;
  /** pills: short choices side by side, e.g. where a customer came from. */
  variant?: "list" | "cards" | "pills";
  /** Spread on every radio, e.g. React Hook Form's register(name). */
  inputProps?: React.ComponentProps<"input">;
  invalid?: boolean;
  /** Shown under the choices, already translated. */
  error?: string;
}) {
  return (
    <fieldset data-ui="RadioGroup" className="grid min-w-0 gap-2" aria-invalid={invalid || undefined}>
      <legend className="mb-1.5 text-sm font-medium text-ink-soft">{label}</legend>
      <div
        className={cn(
          variant === "pills" ? "flex flex-wrap gap-2" : "grid gap-2",
          variant === "cards" && "sm:grid-cols-2",
        )}
      >
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 text-sm",
              variant === "cards" &&
                "rounded-lg border border-line p-3 transition-colors hover:border-ink/25 has-checked:border-brand has-checked:bg-brand-soft/50",
              variant === "pills" &&
                "min-h-10 items-center rounded-full border border-line bg-white px-3.5 transition-colors hover:border-ink/25 has-checked:border-brand has-checked:bg-brand-soft has-focus-visible:ring-3 has-focus-visible:ring-brand/25",
              variant === "pills" && invalid && "border-risk",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              defaultChecked={defaultValue === undefined ? undefined : o.value === defaultValue}
              {...inputProps}
              className={cn(
                "h-[18px] w-[18px] shrink-0",
                variant !== "pills" && "mt-0.5",
                "cursor-pointer appearance-none rounded-full border border-ink/25 bg-white outline-none checked:border-[5px] checked:border-brand focus-visible:ring-3 focus-visible:ring-brand/25",
              )}
            />
            <span className="min-w-0">
              <span className="block font-medium text-ink">{o.label}</span>
              {o.description && <span className="block text-xs text-muted">{o.description}</span>}
            </span>
          </label>
        ))}
      </div>
      {error && <span className="text-xs text-risk">{error}</span>}
    </fieldset>
  );
}
