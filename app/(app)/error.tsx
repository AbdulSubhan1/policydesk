"use client";

import { useTranslations } from "next-intl";
import { Button, EmptyState, Panel } from "@/components/ui";

/** Shown when a page or a server action fails, e.g. a form sent without a required choice. */
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("errors");
  return (
    <Panel className="mx-auto mt-10 max-w-lg" flush>
      <EmptyState
        icon="badgeCheck"
        title={t("generalTitle")}
        description={t("generalBody")}
        action={<Button onClick={reset}>{t("tryAgain")}</Button>}
      />
    </Panel>
  );
}
