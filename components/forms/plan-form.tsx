"use client";

import { useTranslations } from "next-intl";
import { Button, Field, FormError, Input, NumberInput } from "@/components/ui";
import { PRODUCT_COVERS, type Product } from "@/constants/products";
import { coverOptions, productOptions } from "@/lib/options";
import { planSchema } from "@/schemas/plan";
import { createPlan } from "@/server/actions/plans";
import { FormAutocomplete } from "./form-autocomplete";
import { useActionForm } from "./use-action-form";

/** Adds a plan from an insurer. The plan name is entered in both languages. */
export function PlanForm({ insurers, product }: { insurers: { id: number; name: string }[]; product: Product }) {
  const t = useTranslations();
  const { form, pending, onSubmit, errorOf, rootError } = useActionForm(planSchema, createPlan, {
    defaultValues: {
      insurerId: undefined,
      product,
      cover: undefined,
      nameEn: "",
      nameAr: "",
      basePremium: undefined,
      excess: 0,
      benefits: "",
    },
    resetOnSuccess: true,
  });
  const chosenProduct = (form.watch("product") as Product | undefined) ?? product;

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3" noValidate>
      <Field label={t("plans.insurer")} error={errorOf("insurerId")}>
        <FormAutocomplete
          control={form.control}
          name="insurerId"
          placeholder={t("placeholders.insurer")}
          options={insurers.map((i) => ({ value: String(i.id), label: i.name }))}
        />
      </Field>
      <Field label={t("plans.product")} error={errorOf("product")}>
        <FormAutocomplete
          control={form.control}
          name="product"
          placeholder={t("placeholders.product")}
          options={productOptions(t)}
          // Covers depend on the product, so a new product clears the chosen cover
          onPick={() => form.resetField("cover", { defaultValue: undefined })}
        />
      </Field>
      <Field label={t("plans.cover")} error={errorOf("cover")}>
        <FormAutocomplete
          key={chosenProduct}
          control={form.control}
          name="cover"
          placeholder={t("placeholders.cover")}
          options={coverOptions(t, PRODUCT_COVERS[chosenProduct] ? chosenProduct : product)}
        />
      </Field>
      <Field label={t("plans.nameEn")} error={errorOf("nameEn")}>
        <Input placeholder={t("placeholders.planNameEn")} {...form.register("nameEn")} />
      </Field>
      <Field label={t("plans.nameAr")} error={errorOf("nameAr")}>
        <Input dir="rtl" placeholder={t("placeholders.planNameAr")} {...form.register("nameAr")} />
      </Field>
      <Field label={t("plans.basePremium")} error={errorOf("basePremium")}>
        <NumberInput min={1} step={50} placeholder={t("placeholders.premium")} {...form.register("basePremium")} />
      </Field>
      <Field label={t("plans.excess")} error={errorOf("excess")}>
        <NumberInput min={0} step={50} {...form.register("excess")} />
      </Field>
      <Field label={t("plans.benefits")} error={errorOf("benefits")} className="md:col-span-2">
        <Input placeholder={t("placeholders.benefits")} {...form.register("benefits")} />
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
