import type { Product } from "./products";

// What the Brokwise website sells and the fields each line asks for. The rules are in schemas/website.ts; labels
// are in messages/<locale>.json under "opportunities.details" and "opportunities.detailOptions".

/** The products the website sells. Other products are sold by hand and keep the manual screens. */
export const WEBSITE_PRODUCTS = ["car", "travel", "home", "health"] as const satisfies readonly Product[];
export type WebsiteProduct = (typeof WEBSITE_PRODUCTS)[number];

export const isWebsiteProduct = (product: string): product is WebsiteProduct =>
  (WEBSITE_PRODUCTS as readonly string[]).includes(product);

export const TRAVEL_REGIONS = ["gcc", "asia", "europe_schengen", "worldwide_ex_us", "worldwide"] as const;
export const TRIP_TYPES = ["single", "annual"] as const;
export const PROPERTY_TYPES = ["apartment", "villa", "townhouse"] as const;
export const OCCUPANCIES = ["owner", "tenant"] as const;
export const HEALTH_COVER_FOR = ["me", "me_spouse", "family"] as const;

/** Ranges of the website's fields, shared by the schemas and the coordinator's form. */
export const DETAIL_LIMITS = {
  carYearFrom: 1990,
  carValueMax: 1_000_000,
  driverAge: { min: 18, max: 80 },
  yearsLicensedMax: 60,
  tripDaysMax: 180,
  travellers: { min: 1, max: 9 },
  travellerAgeMax: 85,
  buildingValue: { min: 10_000, max: 5_000_000 },
  contentsValue: { min: 1_000, max: 500_000 },
  childrenMax: 6,
  healthAge: { min: 18, max: 75 },
} as const;

/**
 * How the coordinator's form shows one field. `placeholder` names a key under "placeholders" when it differs from
 * the field's own; `past`/`future` limit a date to before or from today.
 */
export type DetailField = { key: string; placeholder?: string } & (
  | { control: "text" }
  | { control: "number"; min: number; max?: number }
  | { control: "money"; min: number; step: number }
  | { control: "date"; range: "past" | "future" }
  | { control: "yesNo" }
  | { control: "choice"; options: readonly string[] }
);

/** Each product's fields in form order, starting with what the quick form asks. */
export const WEBSITE_DETAIL_FIELDS: Record<WebsiteProduct, readonly DetailField[]> = {
  car: [
    { key: "make", control: "text" },
    { key: "model", control: "text" },
    { key: "year", control: "number", min: DETAIL_LIMITS.carYearFrom },
    { key: "gccSpec", control: "yesNo" },
    { key: "carValue", control: "money", min: 1, step: 500 },
    { key: "dateOfBirth", control: "date", range: "past" },
    { key: "nationality", control: "text", placeholder: "nationalityText" },
    { key: "city", control: "text" },
    { key: "yearsLicensed", control: "number", min: 0 },
  ],
  travel: [
    { key: "destination", control: "choice", options: TRAVEL_REGIONS },
    { key: "tripType", control: "choice", options: TRIP_TYPES },
    { key: "startDate", control: "date", range: "future" },
    { key: "endDate", control: "date", range: "future" },
    { key: "travellers", control: "number", ...DETAIL_LIMITS.travellers },
    { key: "oldestAge", control: "number", min: 0, max: DETAIL_LIMITS.travellerAgeMax },
  ],
  home: [
    { key: "city", control: "text" },
    { key: "propertyType", control: "choice", options: PROPERTY_TYPES },
    { key: "occupancy", control: "choice", options: OCCUPANCIES },
    { key: "buildingValue", control: "money", min: DETAIL_LIMITS.buildingValue.min, step: 5_000 },
    { key: "contentsValue", control: "money", min: DETAIL_LIMITS.contentsValue.min, step: 1_000 },
  ],
  health: [
    { key: "coverFor", control: "choice", options: HEALTH_COVER_FOR },
    { key: "children", control: "number", min: 0, max: DETAIL_LIMITS.childrenMax },
    { key: "dateOfBirth", control: "date", range: "past" },
    { key: "city", control: "text" },
    { key: "preExisting", control: "yesNo" },
  ],
};
