import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

const TONES = {
  info: { icon: "info", className: "border-info/25 bg-info-soft text-info" },
  success: { icon: "check", className: "border-brand/25 bg-brand-soft text-brand-strong" },
  warning: { icon: "alert", className: "border-warn/25 bg-warn-soft text-warn" },
  danger: { icon: "alert", className: "border-risk/25 bg-risk-soft text-risk" },
} satisfies Record<string, { icon: IconName; className: string }>;

/** A message that stays on the page, e.g. why a policy can't be booked yet. For short-lived news use a toast. */
export function Alert({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: keyof typeof TONES;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      data-ui="Alert"
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-lg border px-4 py-3 text-sm", TONES[tone].className)}
    >
      <Icon name={TONES[tone].icon} size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        {children && <div className="mt-1 text-ink-soft">{children}</div>}
      </div>
      {action}
    </div>
  );
}
