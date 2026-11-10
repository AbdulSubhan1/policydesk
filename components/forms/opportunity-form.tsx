"use client";

import { useTranslations } from "next-intl";
import { Button, Card, Field, FormError, Input, Textarea } from "@/components/ui";
import { OPPORTUNITY_SOURCES } from "@/constants/statuses";
import { keyedOptions, productOptions } from "@/lib/options";
import { opportunitySchema } from "@/schemas/opportunity";
import { createOpportunity } from "@/server/actions/opportunities";
import { FormAutocomplete } from "./form-autocomplete";
import { useActionForm } from "./use-action-form";

export function OpportunityForm() {
  const t = useTranslations();
  const { form, pending, onSubmit, errorOf, rootError } = useActionForm(opportunitySchema, createOpportunity, {
    defaultValues: { customerName: "", email: "", phone: "", product: undefined, source: undefined, notes: "" },
  });

  return (
    <Card className="p-5 md:p-6">
      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2" noValidate>
        <Field label={t("opportunities.customerName")} error={errorOf("customerName")}>
          <Input autoComplete="name" placeholder={t("placeholders.customerName")} {...form.register("customerName")} />
        </Field>
        <Field label={t("opportunities.email")} error={errorOf("email")}>
          <Input type="email" autoComplete="email" placeholder={t("placeholders.email")} {...form.register("email")} />
        </Field>
        <Field label={t("opportunities.phone")} error={errorOf("phone")}>
          <Input type="tel" autoComplete="tel" placeholder={t("placeholders.phone")} {...form.register("phone")} />
        </Field>
        <Field label={t("opportunities.product")} error={errorOf("product")}>
          <FormAutocomplete
            control={form.control}
            name="product"
            options={productOptions(t)}
            placeholder={t("placeholders.product")}
          />
        </Field>
        <Field label={t("opportunities.source")} error={errorOf("source")}>
          <FormAutocomplete
            control={form.control}
            name="source"
            options={keyedOptions(t, "sources", OPPORTUNITY_SOURCES)}
            placeholder={t("placeholders.source")}
          />
        </Field>
        <Field label={t("opportunities.notes")} error={errorOf("notes")} className="md:col-span-2">
          <Textarea rows={3} placeholder={t("placeholders.notes")} {...form.register("notes")} />
        </Field>
        <div className="grid justify-items-start gap-2 md:col-span-2">
          <FormError message={rootError} />
          <Button variant="primary" disabled={pending}>
            {pending ? t("opportunities.creating") : t("opportunities.create")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
