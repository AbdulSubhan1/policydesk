import { cn } from "@/lib/cn";

const SIDES = {
  top: "bottom-full start-1/2 mb-2 -translate-x-1/2 rtl:translate-x-1/2",
  bottom: "top-full start-1/2 mt-2 -translate-x-1/2 rtl:translate-x-1/2",
  start: "end-full top-1/2 me-2 -translate-y-1/2",
  end: "start-full top-1/2 ms-2 -translate-y-1/2",
} as const;

/**
 * A short label on hover or keyboard focus, for icon buttons and truncated text. Pure CSS, so it works in
 * server components. Never put the only copy of important information in a tooltip.
 */
export function Tooltip({
  content,
  side = "top",
  children,
}: {
  content: string;
  side?: keyof typeof SIDES;
  children: React.ReactNode;
}) {
  return (
    <span data-ui="Tooltip" className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 w-max max-w-56 rounded-md bg-ink px-2 py-1 text-xs text-white opacity-0 shadow-md transition-opacity delay-0 group-focus-within/tip:opacity-100 group-hover/tip:opacity-100 group-hover/tip:delay-300",
          SIDES[side],
        )}
      >
        {content}
      </span>
    </span>
  );
}
