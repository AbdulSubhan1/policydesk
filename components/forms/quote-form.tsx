"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Field,
  FormError,
  NumberInput,
  Panel,
  PriceBreakdown,
  type PriceLine,
} from "@/components/ui";
import type { AddOnKind } from "@/constants/add-ons";
import type { Localized } from "@/constants/i18n";
import { money } from "@/lib/format";
import { localized } from "@/lib/i18n";
import { addOnCost, quoteTotal } from "@/lib/quote-price";
import { quoteSchema } from "@/schemas/quote";
import { createQuote } from "@/server/actions/quotes";
import { FormAutocomplete } from "./form-autocomplete";
import { useActionForm } from "./use-action-form";

export type PlanOption = {
  id: number;
  name: Localized;
  insurer: string;
  cover: string;
  excess: number;
  /** The plan's price for this customer, rated from their answers where the product has them. */
  price: number;
  addOns: { id: number; name: Localized; kind: AddOnKind; price: number }[];
};

const preselected = (plan?: PlanOption) => plan?.addOns.filter((a) => a.kind === "preselected").map((a) => a.id) ?? [];

/** A typed amount, or undefined while the input is empty. */
const typed = (value: unknown) =>
  value === "" || value == null || Number.isNaN(Number(value)) ? undefined : Number(value);

/**
 * Quote from one of the product's plans. Picking a plan lists its add-ons (included ones locked, preselected ones
 * ticked) and fills in the total from the plan's price; the advisor can take a discount off, or type the insurer's
 * own price instead. The total here is a preview: the server prices the ids again.
 */
export function QuoteForm({ leadId, plans }: { leadId: number; plans: PlanOption[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const [overriding, setOverriding] = useState(false);
  // The server's rules plus the one that needs the plan: a discount must leave something to pay
  const schema = useMemo(
    () =>
      quoteSchema.superRefine((v, ctx) => {
        const plan = plans.find((p) => p.id === v.planId);
        if (!plan) return;
        const total = quoteTotal({ subtotal: plan.price + addOnCost(plan.addOns, v.addOnIds), ...v });
        if (!total.ok) ctx.addIssue({ code: "custom", path: ["discount"], message: total.error });
      }),
    [plans],
  );
  const { form, pending, onSubmit, errorOf, rootError } = useActionForm(schema, createQuote, {
    defaultValues: { leadId, planId: undefined, addOnIds: [], discount: "", override: "" },
    success: t("lead.quotes.added"),
  });

  const plan = plans.find((p) => p.id === Number(form.watch("planId")));
  const ticked = (form.watch("addOnIds") ?? []).map(Number);
  const discount = typed(form.watch("discount")) ?? 0;
  const override = overriding ? typed(form.watch("override")) : undefined;
  const subtotal = plan ? plan.price + addOnCost(plan.addOns, ticked) : 0;
  const total = override ?? Math.max(0, subtotal - discount);

  const toggle = (addOnId: number, on: boolean) =>
    form.setValue("addOnIds", on ? [...ticked, addOnId] : ticked.filter((x) => x !== addOnId));
  const switchOverride = (on: boolean) => {
    setOverriding(on);
    form.setValue(on ? "discount" : "override", "");
    form.clearErrors(["discount", "override"]);
  };

  const lines: PriceLine[] = plan
    ? [
        { label: t("lead.quotes.planLine"), amount: money(plan.price) },
        ...plan.addOns
          .filter((a) => a.kind === "included" || ticked.includes(a.id))
          .map(
            (a): PriceLine =>
              a.kind === "included"
                ? { label: localized(a.name, locale), amount: t("lead.quotes.included"), tone: "included" }
                : { label: localized(a.name, locale), amount: money(a.price) },
          ),
      ]
    : [];
  if (plan && override === undefined && discount > 0) {
    lines.push({ label: t("lead.quotes.discount"), amount: `−${money(discount)}`, tone: "minus" });
  }
  if (plan && override !== undefined && override !== subtotal) {
    const change = override - subtotal;
    lines.push({
      label: t("lead.quotes.insurerPrice"),
      amount: change < 0 ? `−${money(-change)}` : `+${money(change)}`,
      tone: change < 0 ? "minus" : undefined,
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(0,17rem)]"
      noValidate
    >
      <div className="grid min-w-0 content-start gap-4">
        <Field
          label={t("lead.quotes.plan")}
          error={errorOf("planId")}
          hint={
            plan
              ? t("lead.quotes.planHint", {
                  cover: t(`covers.${plan.cover}`),
                  excess: money(plan.excess),
                  price: money(plan.price),
                })
              : t("lead.quotes.pickPlanFirst")
          }
        >
          <FormAutocomplete
            control={form.control}
            name="planId"
            options={plans.map((p) => ({
              value: String(p.id),
              label: localized(p.name, locale),
              group: p.insurer,
              hint: `${t(`covers.${p.cover}`)}, ${money(p.price)}`,
            }))}
            placeholder={t("placeholders.plan")}
            onPick={(value) => form.setValue("addOnIds", preselected(plans.find((p) => p.id === Number(value))))}
          />
        </Field>
        {plan && plan.addOns.length > 0 && (
          <div role="group" aria-label={t("lead.quotes.addOnsLegend")} className="grid gap-2.5">
            <p className="text-sm font-medium text-ink-soft">{t("lead.quotes.addOnsLegend")}</p>
            {plan.addOns.map((a) =>
              a.kind === "included" ? (
                <Checkbox
                  key={a.id}
                  label={localized(a.name, locale)}
                  hint={t("lead.quotes.included")}
                  checked
                  disabled
                  readOnly
                />
              ) : (
                <Checkbox
                  key={a.id}
                  label={localized(a.name, locale)}
                  hint={t("lead.quotes.plusPrice", { amount: money(a.price) })}
                  checked={ticked.includes(a.id)}
                  onChange={(e) => toggle(a.id, e.currentTarget.checked)}
                />
              ),
            )}
          </div>
        )}
      </div>

      <Panel className="w-full max-w-md self-start">
        <div className="grid gap-4">
          {overriding ? (
            <Field
              label={t("lead.quotes.insurerPriceLabel")}
              error={errorOf("override")}
              hint={t("lead.quotes.overrideHint")}
            >
              <NumberInput min={1} step={5} placeholder={t("placeholders.premium")} {...form.register("override")} />
            </Field>
          ) : (
            <Field label={t("lead.quotes.discountLabel")} error={errorOf("discount")} optional>
              <NumberInput min={0} step={5} placeholder="0" {...form.register("discount")} />
            </Field>
          )}
          {plan && (
            <PriceBreakdown
              caption={t("lead.quotes.breakdownCaption", { plan: localized(plan.name, locale) })}
              lines={lines}
              total={{ label: t("lead.quotes.totalYear"), amount: money(total) }}
            />
          )}
          {plan && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-self-start"
              onClick={() => switchOverride(!overriding)}
            >
              {overriding ? t("lead.quotes.useWorkedOut") : t("lead.quotes.insurerGaveDifferent")}
            </Button>
          )}
          <FormError message={rootError} />
          <Button variant="primary" disabled={pending}>
            {pending ? t("lead.quotes.adding") : t("lead.quotes.add")}
          </Button>
        </div>
      </Panel>
    </form>
  );
}
