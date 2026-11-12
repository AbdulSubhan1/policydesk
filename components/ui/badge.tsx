import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

export type BadgeTone = "green" | "blue" | "amber" | "red" | "plum" | "grey";

const TONES: Record<BadgeTone, string> = {
  green: "bg-brand-soft text-brand-strong",
  blue: "bg-info-soft text-info",
  amber: "bg-warn-soft text-warn",
  red: "bg-risk-soft text-risk",
  plum: "bg-plum-soft text-plum",
  grey: "bg-paper text-muted",
};

// The colour of every status value in the app. Labels come from messages ("status.<value>").
const STATUS_TONE: Record<string, BadgeTone> = {
  new: "blue",
  contacted: "amber",
  qualified: "plum",
  disqualified: "grey",
  converted: "green",
  new_business: "blue",
  renewal: "plum",
  needs_analysis: "blue",
  quoted: "plum",
  kyc: "amber",
  won: "green",
  lost: "grey",
  draft: "grey",
  sent: "blue",
  accepted: "green",
  rejected: "red",
  pending: "amber",
  submitted: "blue",
  approved: "green",
  booked: "amber",
  active: "green",
  cancelled: "red",
  paid: "green",
  failed: "red",
  refunded: "grey",
  expired: "grey",
  revoked: "red",
  low: "green",
  medium: "amber",
  high: "red",
};

/** Status pill. Pass `status` for a status value (colour and label are automatic), or `tone` + children. */
export function Badge({ status, tone, children }: { status?: string; tone?: BadgeTone; children?: React.ReactNode }) {
  const t = useTranslations("status");
  return (
    <span
      data-ui="Badge"
      className={cn(
        "inline-flex h-6 max-w-full shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        TONES[tone ?? (status ? STATUS_TONE[status] : undefined) ?? "grey"],
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" aria-hidden />
      <span className="truncate">{children ?? (status && t.has(status) ? t(status) : status)}</span>
    </span>
  );
}
