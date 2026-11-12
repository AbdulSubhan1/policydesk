import { getTranslations } from "next-intl/server";
import { Alert } from "@/components/ui";

/** Shown at the top of a screen that the live demo makes read-only. */
export async function DemoLockedNotice({ className }: { className?: string }) {
  const t = await getTranslations("demo");
  return (
    <Alert title={t("lockedTitle")} className={className}>
      {t("lockedBody")}
    </Alert>
  );
}
