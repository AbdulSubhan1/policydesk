import { useTranslations } from "next-intl";
import type { Permission } from "@/lib/rbac";

/** Shown instead of a page when the user's role lacks the permission. */
export function Forbidden({ permission }: { permission: Permission }) {
  const t = useTranslations();
  return (
    <div data-ui="Forbidden" className="mx-auto mt-16 max-w-md text-center">
      <h1 className="text-lg font-semibold text-ink">{t("common.noAccessTitle")}</h1>
      <p className="mt-2 text-sm text-muted">
        {t("common.noAccessBody", { permission: t(`permissions.${permission}`) })}
      </p>
    </div>
  );
}
