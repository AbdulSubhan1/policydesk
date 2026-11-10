import { z } from "zod";
import { PRODUCTS } from "@/constants/products";
import { amount, id, option, optionalEmail, optionalText, requiredText } from "./fields";

export const insurerSchema = z.object({
  name: requiredText(2, 80),
  contactEmail: optionalEmail,
});

export const planSchema = z.object({
  insurerId: id,
  product: option(PRODUCTS),
  cover: requiredText(),
  nameEn: requiredText(2, 80),
  nameAr: optionalText(80),
  basePremium: amount,
  excess: z.coerce.number().int("validation.wholeNumber").min(0, "validation.positive"),
  benefits: optionalText(300),
});

export type InsurerInput = z.infer<typeof insurerSchema>;
export type PlanInput = z.infer<typeof planSchema>;
