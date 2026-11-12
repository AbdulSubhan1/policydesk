"use client";

import { useTranslations } from "next-intl";
import { Controller } from "react-hook-form";
import { Button, ButtonLink, Field, FormError, Input, Panel, PhoneInput, RadioGroup, Textarea } from "@/components/ui";
import { PRODUCTS, departmentOf } from "@/constants/products";
import { OPPORTUNITY_SOURCES } from "@/constants/statuses";
import { keyedOptions, productOptions } from "@/lib/options";
import { opportunitySchema } from "@/schemas/opportunity";
import { createOpportunity } from "@/server/actions/opportunities";
import { FormAutocomplete } from "./form-autocomplete";
import { useActionForm } from "./use-action-form";

// Typed by hand, so the website is not one of the choices
const SOURCES = OPPORTUNITY_SOURCES.filter((s) => s !== "website");

/**
 * A new inquiry in two groups: who the customer is, and what they need. Every field but Notes is required, so only
 * Notes is marked. Errors show under each field and the first wrong field gets the focus.
 */
export function OpportunityForm() {
  const t = useTranslations();
  const { form, pending, onSubmit, errorOf, rootError } = useActionForm(opportunitySchema, createOpportunity, {
    defaultValues: { customerName: "", email: "", phone: "", product: undefined, source: undefined, notes: "" },
  });
  const product = PRODUCTS.find((p) => p === form.watch("product"));
  const sourceError = errorOf("source");

  return (
    <form onSubmit={onSubmit} className="grid max-w-3xl gap-6" noValidate>
      <Panel title={t("opportunities.customerSection")}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={t("opportunities.fullName")} error={errorOf("customerName")} className="md:col-span-2">
            <Input
              autoComplete="name"
              placeholder={t("placeholders.customerName")}
              {...form.register("customerName")}
            />
          </Field>
          <Field label={t("opportunities.email")} error={errorOf("email")}>
            <Input
              type="email"
              autoComplete="email"
              placeholder={t("placeholders.email")}
              {...form.register("email")}
            />
          </Field>
          <Field label={t("opportunities.mobile")} error={errorOf("phone")} group>
            <Controller
              control={form.control}
              name="phone"
              render={({ field, fieldState }) => (
                <PhoneInput
                  {...field}
                  defaultCountry="PK"
                  aria-label={t("opportunities.mobile")}
                  invalid={fieldState.invalid}
                />
              )}
            />
          </Field>
        </div>
      </Panel>

      <Panel title={t("opportunities.needSection")}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label={t("opportunities.product")}
            error={errorOf("product")}
            hint={product && t("opportunities.goesTo", { department: t(`departments.${departmentOf(product)}`) })}
          >
            <FormAutocomplete
              control={form.control}
              name="product"
              options={productOptions(t)}
              placeholder={t("placeholders.product")}
            />
          </Field>
          <RadioGroup
            name="source"
            variant="pills"
            label={t("opportunities.sourceQuestion")}
            options={keyedOptions(t, "sources", SOURCES)}
            inputProps={form.register("source")}
            invalid={!!sourceError}
            error={sourceError && t(sourceError)}
          />
          <Field label={t("opportunities.notes")} error={errorOf("notes")} optional className="md:col-span-2">
            <Textarea rows={3} placeholder={t("placeholders.notes")} {...form.register("notes")} />
          </Field>
        </div>
      </Panel>

      <div className="grid justify-items-end gap-2">
        <FormError message={rootError} />
        <div className="flex flex-wrap justify-end gap-2">
          <ButtonLink href="/opportunities" variant="ghost">
            {t("common.cancel")}
          </ButtonLink>
          <Button variant="primary" disabled={pending}>
            {pending ? t("opportunities.creating") : t("opportunities.create")}
          </Button>
        </div>
      </div>
    </form>
  );
}
