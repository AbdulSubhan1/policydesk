import { z } from "zod";
import { amount, date, email, fullName, id, phone, requiredText } from "./fields";

// What the public website may send. Strict objects, so an extra key (coordinatorId, status…) is refused, not ignored.

const MIN_AGE = 18;
const MAX_AGE = 80;

/** Whole years between an ISO date of birth and today. */
function ageOn(dateOfBirth: string, today = new Date()) {
  const born = new Date(`${dateOfBirth}T00:00:00Z`);
  const age = today.getUTCFullYear() - born.getUTCFullYear();
  const hadBirthday =
    today.getUTCMonth() > born.getUTCMonth() ||
    (today.getUTCMonth() === born.getUTCMonth() && today.getUTCDate() >= born.getUTCDate());
  return hadBirthday ? age : age - 1;
}

export const carDetailsSchema = z.strictObject({
  make: requiredText(1, 40),
  model: requiredText(1, 40),
  year: z.coerce
    .number({ error: "validation.outOfRange" })
    .int("validation.wholeNumber")
    .min(1990, "validation.outOfRange")
    .max(new Date().getFullYear() + 1, "validation.outOfRange"),
  gccSpec: z.boolean("validation.required").optional(),
  carValue: amount.max(1_000_000, "validation.outOfRange").optional(),
  dateOfBirth: date.optional(),
  nationality: requiredText(2, 60).optional(),
  city: requiredText(2, 60).optional(),
  yearsLicensed: z.coerce
    .number({ error: "validation.outOfRange" })
    .int("validation.wholeNumber")
    .min(0, "validation.outOfRange")
    .max(60, "validation.outOfRange")
    .optional(),
});

/** The short form leaves these to the coordinator's call; the full form must have them. */
const FULL_FORM_FIELDS = ["gccSpec", "carValue", "dateOfBirth", "nationality", "city", "yearsLicensed"] as const;

export const websiteOpportunitySchema = z
  .strictObject({
    form: z.enum(["short", "full"], "validation.invalidOption"),
    product: z.literal("car", "validation.invalidOption"),
    customerName: fullName,
    email,
    phone,
    details: carDetailsSchema,
  })
  .superRefine((input, ctx) => {
    if (input.form === "full") {
      for (const field of FULL_FORM_FIELDS) {
        if (input.details[field] === undefined) {
          ctx.addIssue({ code: "custom", message: "validation.required", path: ["details", field] });
        }
      }
    }
    const { dateOfBirth } = input.details;
    if (dateOfBirth) {
      const age = ageOn(dateOfBirth);
      if (age < MIN_AGE || age > MAX_AGE) {
        ctx.addIssue({ code: "custom", message: "validation.age", path: ["details", "dateOfBirth"] });
      }
    }
  });

export type WebsiteOpportunityInput = z.infer<typeof websiteOpportunitySchema>;

/** A plan and the add-ons the visitor ticked. Ids only: PolicyDesk works out every price itself. */
export const websiteSelectionSchema = z.strictObject({ planId: id, addOnIds: z.array(id).max(20) });

export type WebsiteSelectionInput = z.infer<typeof websiteSelectionSchema>;

/** Starting a payment takes nothing: PolicyDesk charges the saved selection, priced by itself. */
export const websitePaymentStartSchema = z.strictObject({});
