import { cn } from "@/lib/cn";

const COLORS = [
  "bg-brand-soft text-brand-strong",
  "bg-info-soft text-info",
  "bg-warn-soft text-warn",
  "bg-plum-soft text-plum",
  "bg-risk-soft text-risk",
];
const SIZES = { sm: "h-7 w-7 text-[11px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm" } as const;
const STATUS = { online: "bg-brand", away: "bg-warn", offline: "bg-line" } as const;

export type AvatarSize = keyof typeof SIZES;

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// The same name always gets the same colour
function colorOf(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

/** A person's initials in a coloured circle. The colour comes from the name, so it stays stable everywhere. */
export function Avatar({
  name,
  size = "md",
  status,
  ring,
}: {
  name: string;
  size?: AvatarSize;
  status?: keyof typeof STATUS;
  ring?: boolean;
}) {
  return (
    <span data-ui="Avatar" role="img" aria-label={name} className="relative inline-flex shrink-0">
      <span
        className={cn(
          "grid place-items-center rounded-full font-semibold select-none",
          SIZES[size],
          colorOf(name),
          ring && "ring-2 ring-white",
        )}
      >
        {initials(name)}
      </span>
      {status && (
        <span className={cn("absolute end-0 bottom-0 h-2.5 w-2.5 rounded-full ring-2 ring-white", STATUS[status])} />
      )}
    </span>
  );
}
