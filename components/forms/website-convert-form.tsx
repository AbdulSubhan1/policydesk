"use client";

import { useTranslations } from "next-intl";
import { Button, FormError } from "@/components/ui";
import { websiteConvertSchema } from "@/schemas/website";
import { convertWebsiteOpportunity } from "@/server/actions/website-opportunities";
import { useActionForm } from "./use-action-form";

/** Converts a website opportunity. A form, not a one-click action, so a missing detail is named right here. */
export function WebsiteConvertForm({ id }: { id: number }) {
  const t = useTranslations("opportunities");
  const { pending, onSubmit, rootError } = useActionForm(websiteConvertSchema, convertWebsiteOpportunity, {
    defaultValues: { id },
    success: t("website.converted"),
  });

  return (
    <form onSubmit={onSubmit} className="grid justify-items-start gap-2" noValidate>
      <FormError message={rootError} />
      <Button variant="primary" disabled={pending}>
        {pending ? t("website.converting") : t("convert")}
      </Button>
    </form>
  );
}
