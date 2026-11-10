import { z } from "zod";
import { PRODUCTS } from "@/constants/products";
import { OPPORTUNITY_SOURCES } from "@/constants/statuses";
import { email, fullName, option, optionalText, phone } from "./fields";

export const opportunitySchema = z.object({
  customerName: fullName,
  email,
  phone,
  product: option(PRODUCTS),
  source: option(OPPORTUNITY_SOURCES),
  notes: optionalText(),
});

export type OpportunityInput = z.infer<typeof opportunitySchema>;
