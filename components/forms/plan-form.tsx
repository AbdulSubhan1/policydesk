"use client";

import { useTranslations } from "next-intl";
import { Button, Field, FormError, Input, Select } from "@/components/ui";
import { DEPARTMENTS, PRODUCT_COVERS, type Product } from "@/constants/products";
import { planSchema } from "@/schemas/plan";
import { createPlan } from "@/server/actions/plans";
import { useActionForm } from "./use-action-form";

/** Adds a plan from an insurer. The plan name is entered in both languages. */
export function PlanForm({ insurers, product }: { insurers: { id: number; name: string }[]; product: Product }) {
  const t = useTranslations();
  const { form, pending, onSubmit, errorOf, rootError } = useActionForm(planSchema, createPlan, {
    defaultValues: {
      insurerId: insurers[0]?.id,
      product,
      cover: PRODUCT_COVERS[product][0],
      nameEn: "",
      nameAr: "",
      basePremium: 0,
      excess: 0,
      benefits: "",
    },
    resetOnSuccess: true,
  });
  const covers = PRODUCT_COVERS[form.watch("product") as Product] ?? [];

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3" noValidate>
      <Field label={t("plans.insurer")} error={errorOf("insurerId")}>
        <Select {...form.register("insurerId")}>
          {insurers.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("plans.product")} error={errorOf("product")}>
        <Select
          {...form.register("product", {
            onChange: (e) => form.setValue("cover", PRODUCT_COVERS[e.target.value as Product][0]),
          })}
        >
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
      <Field label={t("plans.cover")} error={errorOf("cover")}>
        <Select {...form.register("cover")}>
          {covers.map((c) => (
            <option key={c} value={c}>
              {t(`covers.${c}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("plans.nameEn")} error={errorOf("nameEn")}>
        <Input {...form.register("nameEn")} />
      </Field>
      <Field label={t("plans.nameAr")} error={errorOf("nameAr")}>
        <Input dir="rtl" {...form.register("nameAr")} />
      </Field>
      <Field label={t("plans.basePremium")} error={errorOf("basePremium")}>
        <Input type="number" min={1} inputMode="numeric" {...form.register("basePremium")} />
      </Field>
      <Field label={t("plans.excess")} error={errorOf("excess")}>
        <Input type="number" min={0} inputMode="numeric" {...form.register("excess")} />
      </Field>
      <Field label={t("plans.benefits")} error={errorOf("benefits")} className="md:col-span-2">
        <Input {...form.register("benefits")} />
      </Field>
      <div className="grid justify-items-start gap-2 md:col-span-3">
        <FormError message={rootError} />
        <Button variant="primary" disabled={pending}>
          {pending ? t("plans.saving") : t("plans.save")}
        </Button>
      </div>
    </form>
  );
}
