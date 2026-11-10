/** Text with a light sweeping across it, for "working on it" states such as screening or generating. */
export function ShimmerText({ children }: { children: React.ReactNode }) {
  return (
    <span
      data-ui="ShimmerText"
      className="animate-shimmer bg-[linear-gradient(90deg,var(--color-muted)_40%,var(--color-ink)_50%,var(--color-muted)_60%)] bg-[length:200%_100%] bg-clip-text text-transparent motion-reduce:animate-none"
    >
      {children}
    </span>
  );
}
