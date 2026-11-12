const BAR =
  "block h-2 w-full appearance-none overflow-hidden rounded-full bg-paper [&::-moz-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-paper [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:transition-all";

// The filled part. brand = progress towards a goal; neutral = a plain count; risk = losses; info = a breakdown.
const TONES = {
  brand: "[&::-moz-progress-bar]:bg-brand [&::-webkit-progress-value]:bg-brand",
  neutral: "[&::-moz-progress-bar]:bg-ink-soft [&::-webkit-progress-value]:bg-ink-soft",
  risk: "[&::-moz-progress-bar]:bg-risk [&::-webkit-progress-value]:bg-risk",
  info: "[&::-moz-progress-bar]:bg-info [&::-webkit-progress-value]:bg-info",
} as const;

/**
 * A share of a total on the native <progress> element, so no inline width is needed. With `label` it shows the
 * label and percentage above the bar; without one the bar is decorative and the number must be shown nearby.
 */
export function Progress({
  value,
  max = 100,
  label,
  tone = "brand",
}: {
  value: number;
  max?: number;
  label?: string;
  tone?: keyof typeof TONES;
}) {
  const bar = `${BAR} ${TONES[tone]}`;
  if (!label) return <progress data-ui="Progress" value={value} max={max || 1} aria-hidden className={bar} />;
  const percent = max > 0 ? Math.round((Math.min(value, max) / max) * 100) : 0;
  return (
    <div data-ui="Progress" className="grid gap-1.5 text-sm">
      <div className="flex justify-between gap-3">
        <span className="min-w-0 truncate text-ink-soft">{label}</span>
        <span className="font-medium tabular-nums">{percent}%</span>
      </div>
      <progress value={value} max={max} aria-label={label} className={bar} />
    </div>
  );
}
