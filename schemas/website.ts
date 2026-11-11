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

type CarDetails = z.infer<typeof carDetailsSchema>;

/** The rules across fields: the full form needs every field, and the driver must be 18 to 80. */
function checkCarDetails(details: CarDetails, ctx: z.RefinementCtx, { full, path }: { full: boolean; path: string[] }) {
  if (full) {
    for (const field of FULL_FORM_FIELDS) {
      if (details[field] === undefined) {
        ctx.addIssue({ code: "custom", message: "validation.required", path: [...path, field] });
      }
    }
  }
  const { dateOfBirth } = details;
  if (dateOfBirth) {
    const age = ageOn(dateOfBirth);
    if (age < MIN_AGE || age > MAX_AGE) {
      ctx.addIssue({ code: "custom", message: "validation.age", path: [...path, "dateOfBirth"] });
    }
  }
}

export const websiteOpportunitySchema = z
  .strictObject({
    form: z.enum(["short", "full"], "validation.invalidOption"),
    product: z.literal("car", "validation.invalidOption"),
    customerName: fullName,
    email,
    phone,
    details: carDetailsSchema,
  })
  .superRefine((input, ctx) => checkCarDetails(input.details, ctx, { full: input.form === "full", path: ["details"] }));

/** Car details as complete as the full form's: what a website opportunity needs before it becomes a lead. */
export const fullCarDetailsSchema = carDetailsSchema.superRefine((details, ctx) =>
  checkCarDetails(details, ctx, { full: true, path: [] }),
);

/** In a form an empty box (or "Yes"/"No" for GCC spec) stands for what the website sends as a missing key or a boolean. */
const fromForm = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v === "yes" ? true : v === "no" ? false : v), schema);

const { make, model, year, gccSpec, carValue, dateOfBirth, nationality, city, yearsLicensed } = carDetailsSchema.shape;

/** The coordinator completing a website opportunity's car details. Fields may stay empty until convert. */
export const websiteDetailsSchema = z
  .strictObject({
    id,
    make,
    model,
    year,
    gccSpec: fromForm(gccSpec),
    carValue: fromForm(carValue),
    dateOfBirth: fromForm(dateOfBirth),
    nationality: fromForm(nationality),
    city: fromForm(city),
    yearsLicensed: fromForm(yearsLicensed),
  })
  .superRefine((details, ctx) => checkCarDetails(details, ctx, { full: false, path: [] }));

export type WebsiteDetailsInput = z.input<typeof websiteDetailsSchema>;

/** Converting a website opportunity: only its id; the details are checked as saved. */
export const websiteConvertSchema = z.strictObject({ id });

export type WebsiteOpportunityInput = z.infer<typeof websiteOpportunitySchema>;

/** A plan and the add-ons the visitor ticked. Ids only: PolicyDesk works out every price itself. */
export const websiteSelectionSchema = z.strictObject({ planId: id, addOnIds: z.array(id).max(20) });

export type WebsiteSelectionInput = z.infer<typeof websiteSelectionSchema>;

/** Starting a payment takes nothing: PolicyDesk charges the saved selection, priced by itself. */
export const websitePaymentStartSchema = z.strictObject({});
