import type { AutocompleteOption } from "@/components/ui";
import { DEPARTMENTS, PRODUCT_COVERS, type Product } from "@/constants/products";

type Translate = (key: string) => string;

/** Option lists for Autocomplete, built once here so every form shows the same labels and grouping. */

export function productOptions(t: Translate): AutocompleteOption[] {
  return DEPARTMENTS.flatMap((d) =>
    d.products.map((p) => ({ value: p, label: t(`products.${p}`), group: t(`departments.${d.key}`) })),
  );
}

export function coverOptions(t: Translate, product: Product): AutocompleteOption[] {
  return PRODUCT_COVERS[product].map((c) => ({ value: c, label: t(`covers.${c}`) }));
}

/** Values whose labels live under one messages section, e.g. ("status", LEAD_STAGES). */
export function keyedOptions(t: Translate, section: string, values: readonly string[]): AutocompleteOption[] {
  return values.map((v) => ({ value: v, label: t(`${section}.${v}`) }));
}

/** Free-text values that are their own label, e.g. nationalities. */
export function plainOptions(values: readonly string[]): AutocompleteOption[] {
  return values.map((v) => ({ value: v, label: v }));
}
