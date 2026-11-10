import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

type Props = {
  label: string;
  hint?: string;
  /** A message key such as "validation.required". */
  error?: string;
  /** For controls made of several inputs (PhoneInput): a labelled group instead of a <label>. */
  group?: boolean;
  children: React.ReactNode;
  className?: string;
};

/** Label + control + hint or translated error. */
export function Field({ label, hint, error, group, children, className }: Props) {
  const t = useTranslations();
  const Tag = group ? "div" : "label";
  return (
    <Tag
      data-ui="Field"
      role={group ? "group" : undefined}
      aria-label={group ? label : undefined}
      className={cn("grid min-w-0 content-start gap-1.5 text-sm", className)}
    >
      <span className="font-medium text-ink-soft">{label}</span>
      {children}
      {error ? (
        <span className="text-xs text-risk">{t.has(error) ? t(error) : error}</span>
      ) : (
        hint && <span className="text-xs text-muted">{hint}</span>
      )}
    </Tag>
  );
}
