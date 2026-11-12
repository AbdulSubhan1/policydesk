import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

type Props = {
  label: string;
  hint?: string;
  /** A message key such as "validation.required". */
  error?: string;
  /** For controls made of several inputs (PhoneInput): a labelled group instead of a <label>. */
  group?: boolean;
  /** Marks a field the form can be sent without. Mark only the optional ones, never the required. */
  optional?: boolean;
  /** A short note at the end of the label row, e.g. where a pre-filled value came from. */
  tag?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/** Label + control + hint or translated error. */
export function Field({ label, hint, error, group, optional, tag, children, className }: Props) {
  const t = useTranslations();
  const Tag = group ? "div" : "label";
  return (
    <Tag
      data-ui="Field"
      role={group ? "group" : undefined}
      aria-label={group ? label : undefined}
      className={cn("grid min-w-0 content-start gap-1.5 text-sm", className)}
    >
      <span className="flex min-w-0 items-baseline justify-between gap-2">
        <span className="font-medium text-ink-soft">
          {label}
          {optional && <span className="ms-1 font-normal text-muted">({t("common.optional")})</span>}
        </span>
        {tag && <span className="shrink-0 text-xs font-medium text-info">{tag}</span>}
      </span>
      {children}
      {error ? (
        <span className="text-xs text-risk">{t.has(error) ? t(error) : error}</span>
      ) : (
        hint && <span className="text-xs text-muted">{hint}</span>
      )}
    </Tag>
  );
}
