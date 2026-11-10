import { z } from "zod";
import { amount, id } from "./fields";

export const quoteSchema = z.object({
  leadId: id,
  planId: id,
  premium: amount,
});

export type QuoteInput = z.infer<typeof quoteSchema>;
