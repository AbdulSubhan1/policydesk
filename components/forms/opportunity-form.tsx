"use client";

import { useTranslations } from "next-intl";
import { Button, Card, Field, FormError, Input, Select, Textarea } from "@/components/ui";
import { DEPARTMENTS } from "@/constants/products";
import { OPPORTUNITY_SOURCES } from "@/constants/statuses";
import { opportunitySchema } from "@/schemas/opportunity";
import { createOpportunity } from "@/server/actions/opportunities";
import { useActionForm } from "./use-action-form";

export function OpportunityForm() {
  const t = useTranslations();
  const { form, pending, onSubmit, errorOf, rootError } = useActionForm(opportunitySchema, createOpportunity, {
    defaultValues: { customerName: "", email: "", phone: "", product: "car", source: "website", notes: "" },
  });

  return (
    <Card className="p-5 md:p-6">
      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2" noValidate>
        <Field label={t("opportunities.customerName")} error={errorOf("customerName")}>
          <Input autoComplete="name" {...form.register("customerName")} />
        </Field>
        <Field label={t("opportunities.email")} error={errorOf("email")}>
          <Input type="email" autoComplete="email" {...form.register("email")} />
        </Field>
        <Field label={t("opportunities.phone")} error={errorOf("phone")}>
          <Input type="tel" autoComplete="tel" {...form.register("phone")} />
        </Field>
        <Field label={t("opportunities.product")} error={errorOf("product")}>
          <Select {...form.register("product")}>
            {DEPARTMENTS.map((d) => (
              <optgroup key={d.key} label={t(`departments.${d.key}`)}>
                {d.products.map((p) => (
                  <option key={p} value={p}>
                    {t(`products.${p}`)}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>
        <Field label={t("opportunities.source")} error={errorOf("source")}>
          <Select {...form.register("source")}>
            {OPPORTUNITY_SOURCES.map((s) => (
              <option key={s} value={s}>
                {t(`sources.${s}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("opportunities.notes")} error={errorOf("notes")} className="md:col-span-2">
          <Textarea rows={3} {...form.register("notes")} />
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
