import { cn } from "@/lib/cn";

type Option = { value: string; label: string };

/**
 * A short single choice shown all at once, like a view switch (List / Board). Radio inputs underneath, so it submits
 * with a form and works with the keyboard. For more than five options, use Autocomplete.
 */
export function SegmentGroup({
  name,
  options,
  defaultValue,
  label,
}: {
  name: string;
  options: Option[];
  defaultValue?: string;
  label: string;
}) {
  return (
    <div
      data-ui="SegmentGroup"
      role="radiogroup"
      aria-label={label}
      className="inline-flex max-w-full overflow-x-auto rounded-lg bg-paper p-1"
    >
      {options.map((o) => (
        <label key={o.value} className="relative shrink-0 cursor-pointer">
          <input
            type="radio"
            name={name}
            value={o.value}
            defaultChecked={o.value === defaultValue}
            className="peer sr-only"
          />
          <span
            className={cn(
              "block rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted transition-colors",
              "peer-checked:bg-white peer-checked:text-ink peer-checked:shadow-sm peer-focus-visible:ring-3 peer-focus-visible:ring-brand/25 hover:text-ink",
            )}
          >
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}
