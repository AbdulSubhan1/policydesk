"use client";

import { useTranslations } from "next-intl";
import { Button, Card, EmptyState } from "@/components/ui";

/** Shown when a page or a server action fails, e.g. a form sent without a required choice. */
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("errors");
  return (
    <Card className="mx-auto mt-10 max-w-lg">
      <EmptyState title={t("generalTitle")}>
        <p>{t("generalBody")}</p>
        <Button className="mt-4" onClick={reset}>
          {t("tryAgain")}
        </Button>
      </EmptyState>
    </Card>
  );
}
