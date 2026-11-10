import { cn } from "@/lib/cn";

// Class recipes shared by more than one library component. Change a look here and every user of it follows.
// There is no class merging, so never override these through className: add a variant instead.

/** White panel with a hairline border: cards, stats, tables. */
export const surface = "min-w-0 rounded-lg border border-line bg-white";

/** Text inputs, autocompletes and textareas. */
export const control =
  "h-10 w-full min-w-0 rounded-lg border border-line bg-white px-3 text-sm text-ink shadow-xs shadow-ink/5 outline-none transition-colors placeholder:text-muted/70 hover:border-ink/25 focus:border-brand focus:ring-3 focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-paper disabled:text-muted aria-invalid:border-risk aria-invalid:focus:ring-risk/15";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "inverse" | "option";
export type ButtonSize = "sm" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "justify-center bg-brand text-white shadow-xs shadow-brand/20 hover:bg-brand-strong",
  secondary:
    "justify-center border border-line bg-white text-ink shadow-xs shadow-ink/5 hover:border-ink/25 hover:bg-paper",
  danger: "justify-center border border-risk/30 bg-white text-risk hover:bg-risk-soft",
  ghost: "justify-center text-ink-soft hover:bg-paper hover:text-ink",
  // On the dark sidebar and login panel
  inverse: "justify-center text-white/75 hover:bg-white/10 hover:text-white",
  // A full-width choice in a list, with a title and a hint line
  option:
    "w-full justify-start border border-line bg-white py-2.5 text-start text-ink hover:border-brand/40 hover:bg-brand-soft",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-brand/25 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    variant === "option" ? "px-4 text-sm whitespace-normal" : SIZES[size],
    className,
  );
}
