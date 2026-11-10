"use client";

import { useTranslations } from "next-intl";
import { Button, useToast } from "@/components/ui";

/** Buttons that raise each kind of toast, for the Toast page of the component library. */
export function ToastDemo() {
  const t = useTranslations();
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" onClick={() => toast({ title: t("common.saved") })}>
        Success
      </Button>
      <Button type="button" onClick={() => toast({ tone: "error", title: t("errors.invalidLogin") })}>
        Error
      </Button>
      <Button
        type="button"
        onClick={() => toast({ tone: "info", title: t("lead.kyc.waiting"), description: t("lead.kyc.compliance") })}
      >
        With description
      </Button>
    </div>
  );
}
