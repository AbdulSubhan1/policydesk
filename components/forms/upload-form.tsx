"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button, Field, FormError, Input, Select } from "@/components/ui";
import { UPLOAD_MIME_TYPES } from "@/constants/config";
import type { Localized } from "@/constants/i18n";
import { localized } from "@/lib/i18n";
import { documentUploadSchema } from "@/schemas/document-upload";
import { uploadDocument } from "@/server/actions/documents";
import { useActionForm } from "./use-action-form";

/** Uploads one file. The dropdown only offers the document types configured for the lead's product. */
export function UploadForm({
  leadId,
  types,
}: {
  leadId: number;
  types: { id: number; name: Localized; required: boolean }[];
}) {
  const t = useTranslations("lead.documents");
  const locale = useLocale();
  // Files travel as FormData, so the validated values are repacked before calling the action
  const { form, pending, onSubmit, errorOf, rootError } = useActionForm(
    documentUploadSchema,
    ({ leadId, documentTypeId, files }) => {
      const data = new FormData();
      data.set("leadId", String(leadId));
      data.set("documentTypeId", String(documentTypeId));
      data.set("file", files[0]);
      return uploadDocument(data);
    },
    { defaultValues: { leadId, documentTypeId: types[0]?.id }, resetOnSuccess: true },
  );

  return (
    <form onSubmit={onSubmit} className="grid gap-3" noValidate>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start">
        <Field label={t("type")} error={errorOf("documentTypeId")}>
          <Select {...form.register("documentTypeId")}>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {localized(type.name, locale)}
                {type.required ? ` (${t("required")})` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("file")} hint={t("fileHint")} error={errorOf("files")}>
          <Input type="file" accept={UPLOAD_MIME_TYPES.join(",")} {...form.register("files")} />
        </Field>
        <Button variant="primary" disabled={pending} className="sm:mt-6">
          {pending ? t("uploading") : t("upload")}
        </Button>
      </div>
      <FormError message={rootError} />
    </form>
  );
}
