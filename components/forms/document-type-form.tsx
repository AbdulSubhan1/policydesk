"use client";

import { useTranslations } from "next-intl";
import { Button, Field, FormError, Input } from "@/components/ui";
import { documentTypeSchema } from "@/schemas/document-type";
import { createDocumentType } from "@/server/actions/document-settings";
import { useActionForm } from "./use-action-form";

/** Adds a document type to the central list, in both languages. */
export function DocumentTypeForm() {
  const t = useTranslations("documentSettings");
  const { form, pending, onSubmit, errorOf, rootError } = useActionForm(documentTypeSchema, createDocumentType, {
    defaultValues: { nameEn: "", nameAr: "", descriptionEn: "", descriptionAr: "" },
    resetOnSuccess: true,
  });

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2" noValidate>
      <Field label={t("nameEn")} error={errorOf("nameEn")}>
        <Input {...form.register("nameEn")} />
      </Field>
      <Field label={t("nameAr")} error={errorOf("nameAr")}>
        <Input dir="rtl" {...form.register("nameAr")} />
      </Field>
      <Field label={t("descriptionEn")} error={errorOf("descriptionEn")}>
        <Input {...form.register("descriptionEn")} />
      </Field>
      <Field label={t("descriptionAr")} error={errorOf("descriptionAr")}>
        <Input dir="rtl" {...form.register("descriptionAr")} />
      </Field>
      <div className="grid justify-items-start gap-2 sm:col-span-2">
        <FormError message={rootError} />
        <Button variant="primary" disabled={pending}>
          {t("addType")}
        </Button>
      </div>
    </form>
  );
}
