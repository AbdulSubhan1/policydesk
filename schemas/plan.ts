import { z } from "zod";
import { PRODUCTS } from "@/constants/products";
import { amount, email, id, option, optionalText, text } from "./common";

export const insurerSchema = z.object({
  name: text(2, 80),
  contactEmail: z.union([z.literal(""), email]),
});

export const planSchema = z.object({
  insurerId: id,
  product: option(PRODUCTS),
  cover: text(),
  nameEn: text(2, 80),
  nameAr: optionalText(80),
  basePremium: amount,
  excess: z.coerce.number().int("validation.wholeNumber").min(0, "validation.positive"),
  benefits: optionalText(300),
});

export type InsurerInput = z.infer<typeof insurerSchema>;
export type PlanInput = z.infer<typeof planSchema>;
