import { cn } from "@/lib/cn";
import { Avatar, type AvatarSize } from "./avatar";
import { Tooltip } from "./tooltip";

const COUNT = { sm: "h-7 min-w-7 text-[11px]", md: "h-9 min-w-9 text-xs", lg: "h-12 min-w-12 text-sm" } as const;

/** Overlapping avatars for a team; names show on hover and anything past `max` collapses into "+N". */
export function AvatarGroup({ names, max = 4, size = "md" }: { names: string[]; max?: number; size?: AvatarSize }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <span data-ui="AvatarGroup" className="flex items-center -space-x-2 rtl:space-x-reverse">
      {shown.map((name) => (
        <Tooltip key={name} content={name}>
          <span tabIndex={0} className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-brand/25">
            <Avatar name={name} size={size} ring />
          </span>
        </Tooltip>
      ))}
      {rest > 0 && (
        <Tooltip content={names.slice(max).join(", ")}>
          <span
            tabIndex={0}
            className={cn(
              "grid place-items-center rounded-full bg-paper px-1.5 font-semibold text-ink-soft ring-2 ring-white outline-none",
              COUNT[size],
            )}
          >
            +{rest}
          </span>
        </Tooltip>
      )}
    </span>
  );
}
