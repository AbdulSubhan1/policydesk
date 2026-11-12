import { z } from "zod";
import {
  DETAIL_LIMITS,
  HEALTH_COVER_FOR,
  OCCUPANCIES,
  PROPERTY_TYPES,
  TRAVEL_REGIONS,
  TRIP_TYPES,
  type WebsiteProduct,
} from "@/constants/website";
import { amount, date, email, fullName, id, option, phone, requiredText } from "./fields";

// What the public website may send. Strict objects, so an extra key (coordinatorId, status, another product's
// field…) is refused, not ignored. Each product has its details schema, the fields its full form needs and its
// rules across fields; the quick ("short") form sends only the fields that are required in the schema itself.

const DAY_MS = 86_400_000;

/** Whole years between an ISO date of birth and today. */
function ageOn(dateOfBirth: string, today = new Date()) {
  const born = new Date(`${dateOfBirth}T00:00:00Z`);
  const age = today.getUTCFullYear() - born.getUTCFullYear();
  const hadBirthday =
    today.getUTCMonth() > born.getUTCMonth() ||
    (today.getUTCMonth() === born.getUTCMonth() && today.getUTCDate() >= born.getUTCDate());
  return hadBirthday ? age : age - 1;
}

/** Today as an ISO day (UTC), compared with ISO dates as text. */
const todayIso = () => new Date().toISOString().slice(0, 10);

const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);

const wholeNumber = (min: number, max: number) =>
  z.coerce
    .number({ error: "validation.outOfRange" })
    .int("validation.wholeNumber")
    .min(min, "validation.outOfRange")
    .max(max, "validation.outOfRange");

const money = (min: number, max: number) => amount.min(min, "validation.outOfRange").max(max, "validation.outOfRange");

const yesNo = z.boolean("validation.required");

const city = requiredText(2, 60);

export const carDetailsSchema = z.strictObject({
  make: requiredText(1, 40),
  model: requiredText(1, 40),
  year: wholeNumber(DETAIL_LIMITS.carYearFrom, new Date().getFullYear() + 1),
  gccSpec: yesNo.optional(),
  carValue: amount.max(DETAIL_LIMITS.carValueMax, "validation.outOfRange").optional(),
  dateOfBirth: date.optional(),
  nationality: requiredText(2, 60).optional(),
  city: city.optional(),
  yearsLicensed: wholeNumber(0, DETAIL_LIMITS.yearsLicensedMax).optional(),
});

export const travelDetailsSchema = z.strictObject({
  destination: option(TRAVEL_REGIONS),
  tripType: option(TRIP_TYPES).optional(),
  startDate: date.optional(),
  endDate: date.optional(),
  travellers: wholeNumber(DETAIL_LIMITS.travellers.min, DETAIL_LIMITS.travellers.max).optional(),
  oldestAge: wholeNumber(0, DETAIL_LIMITS.travellerAgeMax).optional(),
});

export const homeDetailsSchema = z.strictObject({
  city,
  propertyType: option(PROPERTY_TYPES).optional(),
  occupancy: option(OCCUPANCIES).optional(),
  buildingValue: money(DETAIL_LIMITS.buildingValue.min, DETAIL_LIMITS.buildingValue.max).optional(),
  contentsValue: money(DETAIL_LIMITS.contentsValue.min, DETAIL_LIMITS.contentsValue.max).optional(),
});

export const healthDetailsSchema = z.strictObject({
  coverFor: option(HEALTH_COVER_FOR),
  children: wholeNumber(0, DETAIL_LIMITS.childrenMax).optional(),
  dateOfBirth: date.optional(),
  city: city.optional(),
  preExisting: yesNo.optional(),
});

type Issue = (field: string, message: string) => void;

/** A product's details schema, the fields its full form must have (given the answers so far) and its other rules. */
function rules<S extends z.ZodObject>(
  schema: S,
  required: (details: z.output<S>) => readonly (keyof z.output<S> & string)[],
  check: (details: z.output<S>, issue: Issue) => void,
) {
  return { schema, required, check };
}

function checkAge(
  dateOfBirth: string | undefined,
  { min, max }: { min: number; max: number },
  message: string,
  issue: Issue,
) {
  if (!dateOfBirth) return;
  const age = ageOn(dateOfBirth);
  if (age < min || age > max) issue("dateOfBirth", message);
}

const DETAIL_RULES = {
  car: rules(
    carDetailsSchema,
    () => ["gccSpec", "carValue", "dateOfBirth", "nationality", "city", "yearsLicensed"],
    (d, issue) => checkAge(d.dateOfBirth, DETAIL_LIMITS.driverAge, "validation.age", issue),
  ),
  travel: rules(
    travelDetailsSchema,
    // An annual policy covers a year of trips, so it has no end date
    (d) => [
      "tripType",
      "startDate",
      ...(d.tripType === "annual" ? [] : ["endDate" as const]),
      "travellers",
      "oldestAge",
    ],
    (d, issue) => {
      if (d.startDate && d.startDate < todayIso()) issue("startDate", "validation.startInPast");
      if (d.tripType === "annual") {
        if (d.endDate !== undefined) issue("endDate", "validation.annualNoEndDate");
      } else if (d.startDate && d.endDate) {
        if (d.endDate < d.startDate) issue("endDate", "validation.endBeforeStart");
        else if (daysBetween(d.startDate, d.endDate) > DETAIL_LIMITS.tripDaysMax)
          issue("endDate", "validation.tripTooLong");
      }
    },
  ),
  home: rules(
    homeDetailsSchema,
    (d) => [
      "propertyType",
      "occupancy",
      ...(d.occupancy === "owner" ? ["buildingValue" as const] : []),
      "contentsValue",
    ],
    // A tenant insures only what they own inside
    (d, issue) => {
      if (d.occupancy === "tenant" && d.buildingValue !== undefined) issue("buildingValue", "validation.ownersOnly");
    },
  ),
  health: rules(
    healthDetailsSchema,
    (d) => [...(d.coverFor === "family" ? ["children" as const] : []), "dateOfBirth", "city", "preExisting"],
    (d, issue) => {
      if (d.coverFor !== "family" && d.children !== undefined) issue("children", "validation.familyOnly");
      checkAge(d.dateOfBirth, DETAIL_LIMITS.healthAge, "validation.ageHealth", issue);
    },
  ),
} satisfies Record<WebsiteProduct, unknown>;

type AnyRules = {
  schema: z.ZodObject;
  required: (details: Record<string, unknown>) => readonly string[];
  check: (details: Record<string, unknown>, issue: Issue) => void;
};

/** The rules across fields: the full form needs every field it asks, then each product's own checks. */
function checkDetails(
  product: WebsiteProduct,
  details: Record<string, unknown>,
  ctx: z.RefinementCtx,
  { full, path }: { full: boolean; path: string[] },
) {
  const { required, check } = DETAIL_RULES[product] as unknown as AnyRules;
  const issue: Issue = (field, message) => ctx.addIssue({ code: "custom", message, path: [...path, field] });
  if (full) {
    for (const field of required(details)) {
      if (details[field] === undefined) issue(field, "validation.required");
    }
  }
  check(details, issue);
}

/** The details schema of a website product, without the rules across fields. */
export const detailsSchemaFor = <P extends WebsiteProduct>(product: P): (typeof DETAIL_RULES)[P]["schema"] =>
  DETAIL_RULES[product].schema;

const websiteLead = <P extends WebsiteProduct>(product: P) =>
  z.strictObject({
    form: z.enum(["short", "full"], "validation.invalidOption"),
    product: z.literal(product),
    customerName: fullName,
    email,
    phone,
    details: detailsSchemaFor(product),
  });

/** One branch per website product (WEBSITE_PRODUCTS); a product the website doesn't sell is refused on "product". */
export const websiteOpportunitySchema = z
  .discriminatedUnion(
    "product",
    [websiteLead("car"), websiteLead("travel"), websiteLead("home"), websiteLead("health")],
    "validation.invalidOption",
  )
  .superRefine((input, ctx) =>
    checkDetails(input.product, input.details, ctx, { full: input.form === "full", path: ["details"] }),
  );

export type WebsiteOpportunityInput = z.infer<typeof websiteOpportunitySchema>;

/** Details as complete as the product's full form: what a website opportunity needs before it becomes a lead. */
export const fullDetailsSchemaFor = (product: WebsiteProduct) =>
  (detailsSchemaFor(product) as z.ZodObject).superRefine((details, ctx) =>
    checkDetails(product, details, ctx, { full: true, path: [] }),
  );

/** In a form an empty box (or "Yes"/"No") stands for what the website sends as a missing key or a boolean. */
const fromForm = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v === "yes" ? true : v === "no" ? false : v), schema);

/** What the coordinator's form holds: the opportunity id and each field as typed (text, "yes"/"no" or empty). */
export type WebsiteDetailsInput = { id: number } & Record<string, string | number | boolean | undefined>;
type WebsiteDetailsValues = { id: number } & Record<string, string | number | boolean | undefined>;

/**
 * The coordinator completing a website opportunity's details. Fields the quick form sends stay required; the
 * others may stay empty until convert.
 */
export function websiteDetailsSchemaFor(product: WebsiteProduct): z.ZodType<WebsiteDetailsValues, WebsiteDetailsInput> {
  const shape = (detailsSchemaFor(product) as z.ZodObject).shape;
  const fields = Object.fromEntries(
    Object.entries(shape).map(([key, field]) => [key, field.safeParse(undefined).success ? fromForm(field) : field]),
  );
  return z
    .strictObject({ id, ...fields })
    .superRefine((details, ctx) => checkDetails(product, details, ctx, { full: false, path: [] })) as z.ZodType<
    WebsiteDetailsValues,
    WebsiteDetailsInput
  >;
}

/** Converting a website opportunity: only its id; the details are checked as saved. */
export const websiteConvertSchema = z.strictObject({ id });

/** A plan and the add-ons the visitor ticked. Ids only: PolicyDesk works out every price itself. */
export const websiteSelectionSchema = z.strictObject({ planId: id, addOnIds: z.array(id).max(20) });

export type WebsiteSelectionInput = z.infer<typeof websiteSelectionSchema>;

/** Starting a payment takes nothing: PolicyDesk charges the saved selection, priced by itself. */
export const websitePaymentStartSchema = z.strictObject({});

/** A payment link's token as the website passes it on: 43 base64url characters (32 random bytes). */
export const payTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

/** Opening a payment link takes nothing but the token in the path. */
export const websitePayLinkOpenSchema = z.strictObject({});

/** The coordinator choosing the plan with the customer, on the opportunity page. Priced like the website's choice. */
export const onlinePlanSchema = websiteSelectionSchema.extend({ id });

export type OnlinePlanInput = z.input<typeof onlinePlanSchema>;
