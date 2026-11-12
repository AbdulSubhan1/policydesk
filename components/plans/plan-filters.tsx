"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Autocomplete, Checkbox, type AutocompleteOption } from "@/components/ui";
import { withParams, type SearchParams } from "@/lib/url";

/** The plans list's product, insurer and "Show inactive" controls. Each change applies at once through the URL. */
export function PlanFilters({
  params,
  products,
  insurers,
}: {
  params: SearchParams;
  /** Labelled with their plan counts, e.g. "Car · 9 plans". */
  products: AutocompleteOption[];
  insurers: AutocompleteOption[];
}) {
  const t = useTranslations("plans");
  const router = useRouter();
  // A new filter closes the plan being edited, which may no longer be in the list
  const go = (changes: SearchParams) =>
    router.push(withParams("/admin/plans", params, { ...changes, edit: undefined }), { scroll: false });

  return (
    <div
      role="group"
      aria-label={t("filters")}
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
    >
      <div className="w-full sm:w-56">
        <Autocomplete
          aria-label={t("product")}
          value={params.product ?? "car"}
          options={products}
          onChange={(product) => go({ product, insurer: undefined })}
        />
      </div>
      <div className="w-full sm:w-56">
        <Autocomplete
          aria-label={t("insurer")}
          value={params.insurer ?? ""}
          options={[{ value: "", label: t("allInsurers") }, ...insurers]}
          onChange={(insurer) => go({ insurer })}
        />
      </div>
      <Checkbox
        label={t("showInactive")}
        checked={params.inactive === "1"}
        onChange={(e) => go({ inactive: e.currentTarget.checked ? "1" : undefined })}
      />
    </div>
  );
}
