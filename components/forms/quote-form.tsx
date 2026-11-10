"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button, Field, FormError, Input } from "@/components/ui";
import type { Localized } from "@/constants/i18n";
import { money } from "@/lib/format";
import { localized } from "@/lib/i18n";
import { quoteSchema } from "@/schemas/quote";
import { createQuote } from "@/server/actions/quotes";
import { FormAutocomplete } from "./form-autocomplete";
import { useActionForm } from "./use-action-form";

export type PlanOption = {
  id: number;
  name: Localized;
  insurer: string;
  cover: string;
  basePremium: number;
  excess: number;
  benefits: string[];
};

/** Quote from one of the product's plans; picking a plan fills in its base premium. */
export function QuoteForm({ leadId, plans }: { leadId: number; plans: PlanOption[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const { form, pending, onSubmit, errorOf, rootError } = useActionForm(quoteSchema, createQuote, {
    defaultValues: { leadId, planId: undefined, premium: undefined },
  });
  const plan = plans.find((p) => p.id === Number(form.watch("planId")));
  const options = plans.map((p) => ({
    value: String(p.id),
    label: localized(p.name, locale),
    group: p.insurer,
    hint: `${t(`covers.${p.cover}`)}, ${money(p.basePremium)}`,
  }));

  return (
    <form onSubmit={onSubmit} className="grid gap-3" noValidate>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-start">
        <Field label={t("lead.quotes.plan")} error={errorOf("planId")}>
          <FormAutocomplete
            control={form.control}
            name="planId"
            options={options}
            placeholder={t("placeholders.plan")}
            onPick={(value) => form.setValue("premium", plans.find((p) => p.id === Number(value))?.basePremium ?? 0)}
          />
        </Field>
        <Field label={t("lead.quotes.premiumOffered")} error={errorOf("premium")}>
          <Input
            type="number"
            min={1}
            inputMode="numeric"
            placeholder={t("placeholders.premium")}
            {...form.register("premium")}
          />
        </Field>
        <Button variant="primary" disabled={pending} className="sm:mt-6">
          {pending ? t("lead.quotes.adding") : t("lead.quotes.add")}
        </Button>
      </div>
      {plan && (
        <p className="text-xs text-muted">
          {t("lead.quotes.excess", { amount: money(plan.excess) })}
          {plan.benefits.length > 0 && `. ${plan.benefits.join(", ")}`}
        </p>
      )}
      <FormError message={rootError} />
    </form>
  );
}
