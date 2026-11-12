"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Controller } from "react-hook-form";
import { Button, DatePicker, Field, FormError, Input, NumberInput } from "@/components/ui";
import { WEBSITE_DETAIL_FIELDS, type DetailField, type WebsiteProduct } from "@/constants/website";
import { keyedOptions } from "@/lib/options";
import { websiteDetailsSchemaFor } from "@/schemas/website";
import { saveWebsiteDetails } from "@/server/actions/website-opportunities";
import { FormAutocomplete } from "./form-autocomplete";
import { useActionForm } from "./use-action-form";

type Details = Record<string, string | number | boolean>;

/** A saved answer as the form holds it: text, "yes"/"no", or empty when not asked yet. */
function formValue(field: DetailField, value: string | number | boolean | undefined) {
  if (value === undefined) return field.control === "yesNo" || field.control === "choice" ? undefined : "";
  if (field.control === "yesNo") return value ? "yes" : "no";
  return String(value);
}

/** The product's full-form fields, for the coordinator to complete on the customer's call. Empty = not asked yet. */
export function WebsiteDetailsForm({
  id,
  product,
  details,
}: {
  id: number;
  product: WebsiteProduct;
  details: Details;
}) {
  const t = useTranslations();
  const fields = WEBSITE_DETAIL_FIELDS[product];
  const schema = useMemo(() => websiteDetailsSchemaFor(product), [product]);
  const { form, pending, onSubmit, errorOf, rootError } = useActionForm(schema, saveWebsiteDetails, {
    defaultValues: { id, ...Object.fromEntries(fields.map((f) => [f.key, formValue(f, details[f.key])])) },
    success: t("opportunities.website.detailsSaved"),
  });
  const today = new Date().toISOString().slice(0, 10);

  const control = (field: DetailField, label: string) => {
    // Dates show the picker's own prompt, so only the other controls have a placeholder key
    const placeholder = field.control === "date" ? "" : t(`placeholders.${field.placeholder ?? field.key}`);
    switch (field.control) {
      case "text":
        return <Input placeholder={placeholder} {...form.register(field.key)} />;
      case "number":
        return <NumberInput min={field.min} max={field.max} placeholder={placeholder} {...form.register(field.key)} />;
      case "money":
        return (
          <NumberInput min={field.min} step={field.step} placeholder={placeholder} {...form.register(field.key)} />
        );
      case "yesNo":
      case "choice":
        return (
          <FormAutocomplete
            control={form.control}
            name={field.key}
            options={
              field.control === "yesNo"
                ? [
                    { value: "yes", label: t("common.yes") },
                    { value: "no", label: t("common.no") },
                  ]
                : keyedOptions(t, `opportunities.detailOptions.${field.key}`, field.options)
            }
            placeholder={placeholder}
          />
        );
      case "date":
        return (
          <Controller
            control={form.control}
            name={field.key}
            render={({ field: input, fieldState }) => (
              <DatePicker
                label={label}
                value={typeof input.value === "string" ? input.value : ""}
                onChange={input.onChange}
                {...(field.range === "past" ? { max: today } : { min: today })}
                invalid={fieldState.invalid}
              />
            )}
          />
        );
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
      {fields.map((field) => {
        const label = t(`opportunities.details.${field.key}`);
        return (
          <Field key={field.key} label={label} error={errorOf(field.key)} group={field.control === "date"}>
            {control(field, label)}
          </Field>
        );
      })}
      <div className="grid justify-items-start gap-2 sm:col-span-2">
        <FormError message={rootError} />
        <Button variant="primary" disabled={pending}>
          {pending ? t("opportunities.website.saving") : t("opportunities.website.saveDetails")}
        </Button>
      </div>
    </form>
  );
}
