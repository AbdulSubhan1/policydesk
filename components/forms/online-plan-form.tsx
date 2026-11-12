"use client";

import { useTranslations } from "next-intl";
import { Button, Checkbox, Field, FormError } from "@/components/ui";
import type { AddOnKind } from "@/constants/add-ons";
import { money } from "@/lib/format";
import { onlinePlanSchema } from "@/schemas/website";
import { chooseOnlinePlan } from "@/server/actions/website-payments";
import { FormAutocomplete } from "./form-autocomplete";
import { useActionForm } from "./use-action-form";

export type OnlinePlanOption = {
  id: number;
  name: string;
  insurer: string;
  cover: string;
  basePremium: number;
  addOns: { id: number; name: string; kind: AddOnKind; price: number }[];
};

const preselected = (plan?: OnlinePlanOption) =>
  plan?.addOns.filter((a) => a.kind === "preselected").map((a) => a.id) ?? [];

/**
 * The plan and add-ons the coordinator picks with the customer. The total here is a preview; PolicyDesk prices the
 * saved choice again from the ids, exactly as for the website.
 */
export function OnlinePlanForm({
  opportunityId,
  plans,
  saved,
}: {
  opportunityId: number;
  plans: OnlinePlanOption[];
  saved: { planId: number; addOnIds: number[] } | null;
}) {
  const t = useTranslations();
  const { form, pending, onSubmit, errorOf, rootError } = useActionForm(onlinePlanSchema, chooseOnlinePlan, {
    defaultValues: { id: opportunityId, planId: saved?.planId, addOnIds: saved?.addOnIds ?? [] },
    success: t("opportunities.online.choiceSaved"),
  });
  const plan = plans.find((p) => p.id === Number(form.watch("planId")));
  const ticked = (form.watch("addOnIds") ?? []).map(Number);
  const total =
    plan &&
    plan.basePremium +
      plan.addOns.filter((a) => a.kind !== "included" && ticked.includes(a.id)).reduce((sum, a) => sum + a.price, 0);

  const toggle = (addOnId: number, on: boolean) =>
    form.setValue("addOnIds", on ? [...ticked, addOnId] : ticked.filter((x) => x !== addOnId));

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <Field label={t("opportunities.online.plan")} error={errorOf("planId")}>
        <FormAutocomplete
          control={form.control}
          name="planId"
          options={plans.map((p) => ({
            value: String(p.id),
            label: p.name,
            group: p.insurer,
            hint: `${t(`covers.${p.cover}`)}, ${money(p.basePremium)}`,
          }))}
          placeholder={t("placeholders.plan")}
          onPick={(value) => form.setValue("addOnIds", preselected(plans.find((p) => p.id === Number(value))))}
        />
      </Field>
      {plan && plan.addOns.length > 0 && (
        <div role="group" aria-label={t("opportunities.online.addOns")} className="grid gap-2">
          <p className="text-sm font-medium text-ink-soft">{t("opportunities.online.addOns")}</p>
          {plan.addOns.map((a) =>
            a.kind === "included" ? (
              <Checkbox key={a.id} label={a.name} hint={t("lead.quotes.included")} checked disabled readOnly />
            ) : (
              <Checkbox
                key={a.id}
                label={a.name}
                hint={money(a.price)}
                checked={ticked.includes(a.id)}
                onChange={(e) => toggle(a.id, e.currentTarget.checked)}
              />
            ),
          )}
        </div>
      )}
      {total !== undefined && (
        <p className="text-sm font-medium">
          {t("opportunities.online.total", { amount: t("common.perYear", { amount: money(total) }) })}
        </p>
      )}
      <div className="grid justify-items-start gap-2">
        <FormError message={rootError} />
        <Button variant="primary" disabled={pending}>
          {pending ? t("opportunities.website.saving") : t("opportunities.online.saveChoice")}
        </Button>
      </div>
    </form>
  );
}
