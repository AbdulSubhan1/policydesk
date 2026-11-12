import type { AddOnKind } from "@/constants/add-ons";
import type { Product } from "@/constants/products";

/** One row of the plans-per-insurer-and-product count. */
export type PlanCount = { insurerId: number; product: Product; count: number };

/** Each insurer's plans by product, the biggest line first (e.g. 3 car, then 2 home). Insurers with none are absent. */
export function plansByInsurer(rows: PlanCount[]) {
  const byInsurer = new Map<number, { product: Product; count: number }[]>();
  for (const { insurerId, product, count } of rows) {
    if (count <= 0) continue;
    byInsurer.set(insurerId, [...(byInsurer.get(insurerId) ?? []), { product, count }]);
  }
  for (const list of byInsurer.values()) list.sort((a, b) => b.count - a.count || a.product.localeCompare(b.product));
  return byInsurer;
}

/** How many of a plan's offered add-ons are of each kind; retired ones are not offered. */
export function addOnKinds(addOns: { kind: AddOnKind; active: boolean }[]) {
  const counts: Record<AddOnKind, number> = { included: 0, optional: 0, preselected: 0 };
  for (const a of addOns) if (a.active) counts[a.kind] += 1;
  return counts;
}
