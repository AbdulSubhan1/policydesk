import { z } from "zod";

// Shared field rules. Error messages are keys under "validation" in messages/<locale>.json.

export const id = z.coerce.number().int().positive();
export const text = (min = 1, max = 200) =>
  z
    .string()
    .trim()
    .min(min, min > 1 ? "validation.tooShort" : "validation.required")
    .max(max, "validation.tooLong");
export const optionalText = (max = 1000) => z.string().trim().max(max, "validation.tooLong");
export const email = z.email("validation.email");
export const phone = z.string().trim().min(6, "validation.phone").max(30, "validation.phone");
export const date = z.iso.date("validation.date");
export const amount = z.coerce
  .number({ error: "validation.positive" })
  .int("validation.wholeNumber")
  .positive("validation.positive");
export const option = <const T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values, "validation.invalidOption");

/** What every form server action returns: ok, or a message key for the form. */
export type ActionResult = { ok: true } | { ok: false; error: string };
