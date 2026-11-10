"use client";

import { useTranslations } from "next-intl";
import { Button, Field, FormError, Input } from "@/components/ui";
import { insurerSchema } from "@/schemas/plan";
import { createInsurer } from "@/server/actions/plans";
import { useActionForm } from "./use-action-form";

export function InsurerForm() {
  const t = useTranslations("plans");
  const { form, pending, onSubmit, errorOf, rootError } = useActionForm(insurerSchema, createInsurer, {
    defaultValues: { name: "", contactEmail: "" },
    resetOnSuccess: true,
  });

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start"
      noValidate
    >
      <Field label={t("insurerName")} error={errorOf("name")}>
        <Input {...form.register("name")} />
      </Field>
      <Field label={t("contactEmail")} error={errorOf("contactEmail")}>
        <Input type="email" {...form.register("contactEmail")} />
      </Field>
      <Button variant="primary" disabled={pending} className="sm:mt-6">
        {t("addInsurer")}
      </Button>
      <div className="sm:col-span-3">
        <FormError message={rootError} />
      </div>
    </form>
  );
}
