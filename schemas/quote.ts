import { z } from "zod";
import { amount, id } from "./fields";

/** Empty number inputs send "" or NaN; both mean "not given". */
const blank = (v: unknown) => (v === "" || v === null || (typeof v === "number" && Number.isNaN(v)) ? undefined : v);

/**
 * An advisor's quote: a plan, its ticked add-ons and an optional discount. The server works out the total from the
 * ids; `override` is the insurer's own price when it differs, and replaces that total.
 */
export const quoteSchema = z.object({
  leadId: id,
  planId: id,
  addOnIds: z.array(id),
  discount: z.preprocess(
    blank,
    z.coerce.number().int("validation.wholeNumber").min(0, "validation.positive").optional(),
  ),
  override: z.preprocess(blank, amount.optional()),
});

export type QuoteInput = z.input<typeof quoteSchema>;
