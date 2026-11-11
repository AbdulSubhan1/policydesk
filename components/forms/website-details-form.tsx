"use client";

import { useTranslations } from "next-intl";
import { Controller } from "react-hook-form";
import { Button, DatePicker, Field, FormError, Input, NumberInput } from "@/components/ui";
import { websiteDetailsSchema } from "@/schemas/website";
import { saveWebsiteDetails } from "@/server/actions/website-opportunities";
import { FormAutocomplete } from "./form-autocomplete";
import { useActionForm } from "./use-action-form";

type Details = Record<string, string | number | boolean>;

/** The full form's car and driver fields, for the coordinator to complete on the customer's call. Empty = not asked yet. */
export function WebsiteDetailsForm({ id, details }: { id: number; details: Details }) {
  const t = useTranslations();
  const text = (key: string) => (details[key] === undefined ? "" : String(details[key]));
  const { form, pending, onSubmit, errorOf, rootError } = useActionForm(websiteDetailsSchema, saveWebsiteDetails, {
    defaultValues: {
      id,
      make: text("make"),
      model: text("model"),
      year: text("year"),
      gccSpec: details.gccSpec === undefined ? undefined : details.gccSpec ? "yes" : "no",
      carValue: text("carValue"),
      dateOfBirth: text("dateOfBirth"),
      nationality: text("nationality"),
      city: text("city"),
      yearsLicensed: text("yearsLicensed"),
    },
    success: t("opportunities.website.detailsSaved"),
  });
  const label = (key: string) => t(`opportunities.details.${key}`);

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
      <Field label={label("make")} error={errorOf("make")}>
        <Input placeholder={t("placeholders.make")} {...form.register("make")} />
      </Field>
      <Field label={label("model")} error={errorOf("model")}>
        <Input placeholder={t("placeholders.model")} {...form.register("model")} />
      </Field>
      <Field label={label("year")} error={errorOf("year")}>
        <NumberInput min={1990} placeholder={t("placeholders.year")} {...form.register("year")} />
      </Field>
      <Field label={label("gccSpec")} error={errorOf("gccSpec")}>
        <FormAutocomplete
          control={form.control}
          name="gccSpec"
          options={[
            { value: "yes", label: t("common.yes") },
            { value: "no", label: t("common.no") },
          ]}
          placeholder={t("placeholders.gccSpec")}
        />
      </Field>
      <Field label={label("carValue")} error={errorOf("carValue")}>
        <NumberInput min={1} step={500} placeholder={t("placeholders.carValue")} {...form.register("carValue")} />
      </Field>
      <Field label={label("dateOfBirth")} error={errorOf("dateOfBirth")} group>
        <Controller
          control={form.control}
          name="dateOfBirth"
          render={({ field, fieldState }) => (
            <DatePicker
              label={label("dateOfBirth")}
              value={typeof field.value === "string" ? field.value : ""}
              onChange={field.onChange}
              max={new Date().toISOString().slice(0, 10)}
              invalid={fieldState.invalid}
            />
          )}
        />
      </Field>
      <Field label={label("nationality")} error={errorOf("nationality")}>
        <Input placeholder={t("placeholders.nationalityText")} {...form.register("nationality")} />
      </Field>
      <Field label={label("city")} error={errorOf("city")}>
        <Input placeholder={t("placeholders.city")} {...form.register("city")} />
      </Field>
      <Field label={label("yearsLicensed")} error={errorOf("yearsLicensed")}>
        <NumberInput min={0} placeholder={t("placeholders.yearsLicensed")} {...form.register("yearsLicensed")} />
      </Field>
      <div className="grid justify-items-start gap-2 sm:col-span-2">
        <FormError message={rootError} />
        <Button variant="primary" disabled={pending}>
          {pending ? t("opportunities.website.saving") : t("opportunities.website.saveDetails")}
        </Button>
      </div>
    </form>
  );
}
