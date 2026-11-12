"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import {
  Autocomplete,
  Button,
  ButtonLink,
  DataTable,
  Field,
  FormError,
  Icon,
  Input,
  NumberInput,
} from "@/components/ui";
import type { AddOnKind } from "@/constants/add-ons";
import type { Localized } from "@/constants/i18n";
import { money } from "@/lib/format";
import { localized } from "@/lib/i18n";
import { ADD_ON_OFFERS, planEditSchema } from "@/schemas/plan";
import { savePlan } from "@/server/actions/plans";
import { FormAutocomplete } from "./form-autocomplete";
import { useActionForm } from "./use-action-form";

type AddOnOffer = (typeof ADD_ON_OFFERS)[number];
type AddOnRow = { key: string; name: Localized; kind: AddOnKind; price: number; active: boolean };

/**
 * Edits one plan in place: price, excess, benefits as chips and how each add-on is offered. Deactivating lives in a
 * separate one-click form (`toggleForm`) so it never sends the unsaved edits. Saved quotes keep their snapshot.
 */
export function PlanEditForm({
  plan,
  addOns,
  catalogue,
  toggleForm,
  active,
  cancelHref,
}: {
  plan: { id: number; basePremium: number; excess: number; benefits: string[] };
  addOns: AddOnRow[];
  /** Add-ons this product can offer; the ones the plan lacks can be added. */
  catalogue: { key: string; name: Localized; price: number }[];
  toggleForm: string;
  active: boolean;
  cancelHref: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [benefit, setBenefit] = useState("");
  const { form, pending, onSubmit, errorOf, rootError } = useActionForm(planEditSchema, savePlan, {
    defaultValues: {
      planId: plan.id,
      basePremium: plan.basePremium,
      excess: plan.excess,
      benefits: plan.benefits,
      addOns: addOns.map((a) => ({ key: a.key, offer: a.active ? a.kind : ("off" as const), price: a.price })),
    },
  });

  const benefits = (form.watch("benefits") ?? []) as string[];
  const rows = (form.watch("addOns") ?? []) as { key: string; offer: AddOnOffer; price: unknown }[];
  const nameOf = (key: string) =>
    localized(addOns.find((a) => a.key === key)?.name ?? catalogue.find((c) => c.key === key)?.name, locale);
  const missing = catalogue.filter((c) => !rows.some((r) => r.key === c.key));

  const addBenefit = () => {
    const text = benefit.trim();
    if (text && !benefits.includes(text)) form.setValue("benefits", [...benefits, text], { shouldDirty: true });
    setBenefit("");
  };
  const offers = ADD_ON_OFFERS.map((o) => ({ value: o, label: t(`plans.offer.${o}`) }));

  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,12rem)_minmax(0,12rem)_minmax(0,1fr)]">
        <Field label={t("plans.priceYear")} error={errorOf("basePremium")}>
          <NumberInput min={1} step={5} {...form.register("basePremium")} />
        </Field>
        <Field label={t("plans.excess")} error={errorOf("excess")}>
          <NumberInput min={0} step={5} {...form.register("excess")} />
        </Field>
        <Field
          label={t("plans.benefitsLabel")}
          error={errorOf("benefits")}
          group
          className="sm:col-span-2 lg:col-span-1"
        >
          {benefits.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {benefits.map((b) => (
                <li
                  key={b}
                  className="inline-flex max-w-full items-center gap-1 rounded-full bg-paper ps-3 text-sm text-ink"
                >
                  <span className="truncate">{b}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={t("plans.removeBenefit", { benefit: b })}
                    onClick={() =>
                      form.setValue(
                        "benefits",
                        benefits.filter((x) => x !== b),
                        { shouldDirty: true },
                      )
                    }
                  >
                    <Icon name="close" size={13} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Input
              value={benefit}
              aria-label={t("plans.benefitsLabel")}
              placeholder={t("placeholders.benefit")}
              onChange={(e) => setBenefit(e.currentTarget.value)}
              onKeyDown={(e) => {
                // Enter adds the chip instead of sending the form
                if (e.key === "Enter") {
                  e.preventDefault();
                  addBenefit();
                }
              }}
            />
            <Button type="button" onClick={addBenefit}>
              {t("plans.addBenefit")}
            </Button>
          </div>
        </Field>
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-medium text-ink-soft">{t("plans.addOns")}</p>
        <DataTable
          embedded
          path=""
          minWidth="sm"
          rows={rows.map((r, index) => ({ ...r, index }))}
          rowKey={(r) => r.key}
          empty={{ title: t("plans.addOnSummary.none") }}
          columns={[
            { key: "name", header: t("plans.addOnName"), cell: (r) => nameOf(r.key) },
            {
              key: "offer",
              header: t("plans.howOffered"),
              cell: (r) => (
                <div className="w-48">
                  <FormAutocomplete
                    control={form.control}
                    name={`addOns.${r.index}.offer`}
                    options={offers}
                    aria-label={t("plans.howOfferedFor", { name: nameOf(r.key) })}
                  />
                </div>
              ),
            },
            {
              key: "price",
              header: t("plans.priceYear"),
              align: "end",
              cell: (r) =>
                r.offer === "included" ? (
                  <span className="font-medium text-brand-strong">{t("plans.offer.included")}</span>
                ) : (
                  <div className="ms-auto w-36">
                    <NumberInput
                      min={0}
                      step={5}
                      aria-label={t("plans.priceFor", { name: nameOf(r.key) })}
                      {...form.register(`addOns.${r.index}.price`)}
                    />
                  </div>
                ),
            },
          ]}
        />
        <p className="text-xs text-muted">{t("plans.offersHint")}</p>
        {missing.length > 0 && (
          <div className="w-full sm:w-72">
            <Autocomplete
              aria-label={t("plans.addAddOn")}
              placeholder={t("plans.pickAddOn")}
              value=""
              options={missing.map((c) => ({
                value: c.key,
                label: localized(c.name, locale),
                hint: money(c.price),
              }))}
              onChange={(key) => {
                const item = catalogue.find((c) => c.key === key);
                if (item) {
                  form.setValue("addOns", [...rows, { key, offer: "optional" as const, price: item.price }], {
                    shouldDirty: true,
                  });
                }
              }}
            />
          </div>
        )}
      </div>

      <FormError message={rootError} />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" disabled={pending}>
          {pending ? t("plans.saving") : t("plans.saveChanges")}
        </Button>
        <ButtonLink href={cancelHref} variant="ghost" scroll={false}>
          {t("common.cancel")}
        </ButtonLink>
        <Button form={toggleForm} variant={active ? "danger" : "secondary"} className="ms-auto">
          {active ? t("plans.deactivatePlan") : t("plans.activatePlan")}
        </Button>
      </div>
    </form>
  );
}
