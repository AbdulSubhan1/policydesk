"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button, Field, FormError, Input, Select } from "@/components/ui";
import type { Localized } from "@/constants/i18n";
import { money } from "@/lib/format";
import { localized } from "@/lib/i18n";
import { quoteSchema } from "@/schemas/quote";
import { createQuote } from "@/server/actions/quotes";
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
    defaultValues: { leadId, planId: plans[0].id, premium: plans[0].basePremium },
  });
  const plan = plans.find((p) => p.id === Number(form.watch("planId")));
  const insurers = [...new Set(plans.map((p) => p.insurer))];

  return (
    <form onSubmit={onSubmit} className="grid gap-3" noValidate>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-start">
        <Field label={t("lead.quotes.plan")} error={errorOf("planId")}>
          <Select
            {...form.register("planId", {
              onChange: (e) =>
                form.setValue("premium", plans.find((p) => p.id === Number(e.target.value))?.basePremium ?? 0),
            })}
          >
            {insurers.map((insurer) => (
              <optgroup key={insurer} label={insurer}>
                {plans
                  .filter((p) => p.insurer === insurer)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {localized(p.name, locale)}, {t(`covers.${p.cover}`)}, {money(p.basePremium)}
                    </option>
                  ))}
              </optgroup>
            ))}
          </Select>
        </Field>
        <Field label={t("lead.quotes.premiumOffered")} error={errorOf("premium")}>
          <Input type="number" min={1} inputMode="numeric" {...form.register("premium")} />
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
