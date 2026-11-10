import { cn } from "@/lib/cn";

const SHAPES = {
  line: "h-3.5 w-full rounded",
  title: "h-6 w-48 rounded-md",
  avatar: "h-9 w-9 rounded-full",
  badge: "h-6 w-20 rounded-full",
  block: "h-24 w-full rounded-lg",
  control: "h-10 w-full rounded-lg",
} as const;

/** A shimmering placeholder in the shape of content that is still loading. Compose shapes to match the real layout. */
export function Skeleton({ shape = "line", className }: { shape?: keyof typeof SHAPES; className?: string }) {
  return (
    <span
      data-ui="Skeleton"
      aria-hidden
      className={cn(
        "block animate-shimmer bg-[linear-gradient(90deg,var(--color-paper)_25%,var(--color-line)_50%,var(--color-paper)_75%)] bg-[length:200%_100%]",
        SHAPES[shape],
        className,
      )}
    />
  );
}
