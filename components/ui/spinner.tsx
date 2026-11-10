import { cn } from "@/lib/cn";

const SIZES = { sm: "h-4 w-4 border-2", md: "h-5 w-5 border-2", lg: "h-8 w-8 border-[3px]" } as const;

/** Something is working and the wait is short. For content that is loading, prefer a Skeleton in its shape. */
export function Spinner({ size = "md", label }: { size?: keyof typeof SIZES; label: string }) {
  return (
    <span
      data-ui="Spinner"
      role="status"
      aria-label={label}
      className={cn(
        "inline-block animate-spin rounded-full border-current border-e-transparent text-brand",
        SIZES[size],
      )}
    />
  );
}
