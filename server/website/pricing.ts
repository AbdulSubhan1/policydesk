import type { AddOnKind, QuoteAddOn } from "@/constants/add-ons";
import type { Localized } from "@/constants/i18n";

/** One priced line of a selection. Labels are English; the plan line is added by the caller. */
export type SelectionLine = { label: string; kind: "plan" | AddOnKind; amount: number };

type PlanAddOn = {
  id: number;
  planId: number;
  key: string;
  name: Localized;
  kind: AddOnKind;
  price: number;
  active: boolean;
};

/**
 * Prices a plan with the add-ons the customer ticked. The website only sends ids, so every id must be a
 * tickable add-on of this plan: anything else (included, another plan's, retired, repeated, unknown) is refused.
 */
export function priceSelection(
  plan: { id: number; basePremium: number },
  addOns: PlanAddOn[],
  chosenIds: number[],
):
  | { ok: true; lines: SelectionLine[]; addOns: QuoteAddOn[]; total: number }
  | { ok: false; field: "addOnIds"; message: string } {
  const chosen = new Set(chosenIds);
  if (chosen.size !== chosenIds.length) return { ok: false, field: "addOnIds", message: "An add-on is listed twice" };

  for (const id of chosen) {
    const addOn = addOns.find((a) => a.id === id);
    if (!addOn || addOn.planId !== plan.id || !addOn.active || addOn.kind === "included") {
      return { ok: false, field: "addOnIds", message: `Add-on ${id} cannot be chosen for this plan` };
    }
  }

  const taken = addOns
    .filter((a) => a.planId === plan.id && a.active && (a.kind === "included" || chosen.has(a.id)))
    // Included means free, whatever price the row holds
    .map(({ key, name, kind, price }) => ({ key, name, kind, price: kind === "included" ? 0 : price }));
  return {
    ok: true,
    lines: taken.map((a) => ({ label: a.name.en, kind: a.kind, amount: a.price })),
    addOns: taken,
    total: plan.basePremium + taken.reduce((sum, a) => sum + a.price, 0),
  };
}
