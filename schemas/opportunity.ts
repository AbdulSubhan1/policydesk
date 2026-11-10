import { z } from "zod";
import { PRODUCTS } from "@/constants/products";
import { OPPORTUNITY_SOURCES } from "@/constants/statuses";
import { email, option, optionalText, phone, text } from "./common";

export const opportunitySchema = z.object({
  customerName: text(2, 120),
  email,
  phone,
  product: option(PRODUCTS),
  source: option(OPPORTUNITY_SOURCES),
  notes: optionalText(),
});

export type OpportunityInput = z.infer<typeof opportunitySchema>;
