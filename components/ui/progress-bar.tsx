// Literal class names (Tailwind only generates classes it can see), one step per 10%
const WIDTHS = [
  "w-0",
  "w-1/10",
  "w-2/10",
  "w-3/10",
  "w-4/10",
  "w-5/10",
  "w-6/10",
  "w-7/10",
  "w-8/10",
  "w-9/10",
  "w-full",
];

/** Horizontal bar for a share of a total, rounded to the nearest 10%. */
export function ProgressBar({ value, total }: { value: number; total: number }) {
  const step = total > 0 ? Math.round((value / total) * 10) : 0;
  return (
    <span data-ui="ProgressBar" className="block h-1.5 overflow-hidden rounded-full bg-paper" aria-hidden>
      <span className={`block h-full rounded-full bg-brand ${WIDTHS[step]}`} />
    </span>
  );
}
