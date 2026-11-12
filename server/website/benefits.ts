import { PLAN_BENEFITS } from "@/constants/benefits";
import type { WebsiteProduct } from "@/constants/website";

/**
 * `count` benefits from the product's list, starting at `start` and wrapping. Fixed by its inputs, so the seed and
 * every `db:setup` run give a plan the same set.
 */
export function pickBenefits(product: WebsiteProduct, count: number, start: number): string[] {
  const list = PLAN_BENEFITS[product];
  return Array.from({ length: Math.min(count, list.length) }, (_, i) => list[(start + i) % list.length]);
}

/** A plan needs new benefits when it lists one that is not its product's (the seed once shared one list). */
export function needsBenefitFix(product: WebsiteProduct, benefits: readonly string[]) {
  return benefits.some((b) => !PLAN_BENEFITS[product].includes(b));
}
