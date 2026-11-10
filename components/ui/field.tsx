import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

/** Label + control + hint or error. `error` is a message key such as "validation.required". */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations();
  return (
    <label data-ui="Field" className={cn("grid min-w-0 content-start gap-1.5 text-sm", className)}>
      <span className="font-medium text-ink-soft">{label}</span>
      {children}
      {error ? (
        <span className="text-xs text-risk">{t.has(error) ? t(error) : error}</span>
      ) : (
        hint && <span className="text-xs text-muted">{hint}</span>
      )}
    </label>
  );
}
