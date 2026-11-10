import { z } from "zod";
import { splitPhone } from "@/constants/countries";

// The one place for field rules. Every form schema in schemas/ is built from these, so a rule changes everywhere at once.
// Error messages are keys under "validation" in messages/<locale>.json.

/** Letters in any script (Latin, Arabic…), plus spaces, apostrophes, hyphens and dots. */
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u;

export const id = z.coerce.number().int().positive("validation.required");

export const requiredText = (min = 1, max = 200) =>
  z.string().trim().min(1, "validation.required").min(min, "validation.tooShort").max(max, "validation.tooLong");

export const optionalText = (max = 1000) => z.string().trim().max(max, "validation.tooLong");

export const firstName = requiredText(2, 40).regex(NAME_PATTERN, "validation.name");
export const lastName = requiredText(2, 40).regex(NAME_PATTERN, "validation.name");
export const fullName = requiredText(3, 80)
  .regex(NAME_PATTERN, "validation.name")
  .refine((v) => v.split(/\s+/).length >= 2, "validation.fullName");

export const email = z
  .string()
  .trim()
  .min(1, "validation.required")
  .pipe(z.email("validation.email"))
  .transform((v) => v.toLowerCase());
export const optionalEmail = z.union([z.literal(""), email]);

/** International number in E.164 form (+971501234567) with the right length for its country. */
export const phone = z
  .string()
  .trim()
  .min(1, "validation.required")
  .regex(/^\+\d{6,15}$/, "validation.phone")
  .refine((v) => {
    const { country, national } = splitPhone(v);
    return !!country && national.length >= country.min && national.length <= country.max;
  }, "validation.phoneLength");

export const date = z.iso.date("validation.date");

export const amount = z.coerce
  .number({ error: "validation.positive" })
  .int("validation.wholeNumber")
  .positive("validation.positive");

export const option = <const T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values, "validation.invalidOption");
