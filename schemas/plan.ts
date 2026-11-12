import { z } from "zod";
import { ADD_ON_KINDS } from "@/constants/add-ons";
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

const wholeAmount = z.coerce.number().int("validation.wholeNumber").min(0, "validation.positive");

/** "off" retires an add-on: quotes that have it keep their copy, new quotes can't pick it. */
export const ADD_ON_OFFERS = [...ADD_ON_KINDS, "off"] as const;

/** Editing a plan: its price, excess, benefits and how each add-on is offered. */
export const planEditSchema = z.object({
  planId: id,
  basePremium: amount,
  excess: wholeAmount,
  benefits: z.array(requiredText(2, 80)).max(12, "validation.tooLong"),
  addOns: z.array(z.object({ key: requiredText(1, 60), offer: option(ADD_ON_OFFERS), price: wholeAmount })),
});

export type InsurerInput = z.infer<typeof insurerSchema>;
export type PlanInput = z.infer<typeof planSchema>;
export type PlanEditInput = z.input<typeof planEditSchema>;
