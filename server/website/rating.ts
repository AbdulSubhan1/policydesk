import type { WebsiteProduct } from "@/constants/website";

// Made-up rating for the demo: each plan's base premium is the price for a "typical" customer, and the answers from
// the website form move it up or down. Every factor is 1 when its answer is missing (quick form, or an opportunity a
// coordinator typed in), so a plan never gets cheaper or dearer because a field was skipped.

type Details = Record<string, string | number | boolean | undefined>;

/** Covers that pay for the customer's own car, so the car's value, spec and repairs matter. */
const OWN_DAMAGE = ["comprehensive", "comprehensive_agency"];

const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : undefined);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Whole years between an ISO date of birth and today. */
function ageOn(dateOfBirth: unknown, today = new Date()) {
  if (typeof dateOfBirth !== "string" || dateOfBirth === "") return undefined;
  const born = new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(born.getTime())) return undefined;
  const age = today.getUTCFullYear() - born.getUTCFullYear();
  const hadBirthday =
    today.getUTCMonth() > born.getUTCMonth() ||
    (today.getUTCMonth() === born.getUTCMonth() && today.getUTCDate() >= born.getUTCDate());
  return hadBirthday ? age : age - 1;
}

/** Days covered by a trip, counting both the first and the last day. */
function tripDays(start: unknown, end: unknown) {
  if (typeof start !== "string" || typeof end !== "string") return undefined;
  const days = Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;
  return Number.isFinite(days) && days > 0 ? days : undefined;
}

/** The first band whose upper bound fits the value; values past the last bound take the last band. */
function band(value: number | undefined, bands: readonly [upTo: number, factor: number][]) {
  if (value === undefined) return 1;
  return (bands.find(([upTo]) => value <= upTo) ?? bands[bands.length - 1])[1];
}

/** Scales with an insured value around the typical one, never below `floor` of the base price. */
const byValue = (value: number | undefined, typical: number, floor: number, cap: number) =>
  value === undefined ? 1 : clamp(floor + (1 - floor) * (value / typical), floor, cap);

const FACTORS: Record<WebsiteProduct, (cover: string, d: Details) => number[]> = {
  // Typical: an $18,000 car on GCC spec, a driver of 30 to 59 with 5 or more years on a licence
  car: (cover, d) => {
    const ownDamage = OWN_DAMAGE.includes(cover);
    return [
      ownDamage ? byValue(num(d.carValue), 18_000, 0.5, 3) : 1,
      ownDamage && d.gccSpec === false ? 1.1 : 1,
      band(ageOn(d.dateOfBirth), [
        [24, 1.4],
        [29, 1.15],
        [59, 1],
        [69, 1.1],
        [200, 1.3],
      ]),
      band(num(d.yearsLicensed), [
        [0, 1.3],
        [2, 1.2],
        [4, 1.1],
        [200, 1],
      ]),
    ];
  },
  // Typical: one traveller under 60, a week in Asia. An annual plan covers any trip length.
  travel: (cover, d) => [
    cover === "annual_multi_trip"
      ? 1
      : band(tripDays(d.startDate, d.endDate), [
          [7, 1],
          [14, 1.4],
          [30, 1.9],
          [90, 3],
          [365, 4.5],
        ]),
    ({ gcc: 0.8, asia: 1, europe_schengen: 1.1, worldwide_ex_us: 1.3, worldwide: 1.6 } as Record<string, number>)[
      String(d.destination)
    ] ?? 1,
    1 + 0.75 * (clamp(num(d.travellers) ?? 1, 1, 9) - 1),
    band(num(d.oldestAge), [
      [59, 1],
      [69, 1.5],
      [200, 2.2],
    ]),
  ],
  // Typical: an apartment worth $250,000 to rebuild, with $20,000 of contents
  home: (cover, d) => {
    const building = byValue(num(d.buildingValue), 250_000, 0.3, 8);
    const contents = byValue(num(d.contentsValue), 20_000, 0.3, 8);
    const insured = cover === "building" ? building : cover === "contents" ? contents : 0.7 * building + 0.3 * contents;
    const property = ({ villa: 1.15, townhouse: 1.05 } as Record<string, number>)[String(d.propertyType)] ?? 1;
    return [insured, property];
  },
  // Typical: one adult of 30 to 44 with no pre-existing condition
  health: (_cover, d) => [
    d.coverFor === "me_spouse" ? 1.85 : d.coverFor === "family" ? 1.85 + 0.45 * (num(d.children) ?? 0) : 1,
    band(ageOn(d.dateOfBirth), [
      [29, 0.8],
      [44, 1],
      [54, 1.35],
      [64, 1.8],
      [200, 2.4],
    ]),
    d.preExisting === true ? 1.25 : 1,
  ],
};

/** A plan's price for this customer: its base premium moved by their answers, to the nearest $5. */
export function ratePremium(product: WebsiteProduct, cover: string, basePremium: number, details: Details) {
  const factor = FACTORS[product](cover, details).reduce((a, b) => a * b, 1);
  return Math.max(5, Math.round((basePremium * factor) / 5) * 5);
}

/**
 * Whether a cover suits the answers: a tenant can't insure the building, and a trip's plans follow its type
 * (Schengen visa cover only for a single trip to Europe). Missing answers fit every cover.
 */
export function coverFits(product: WebsiteProduct, cover: string, details: Details) {
  if (product === "home" && details.occupancy === "tenant") return cover === "contents";
  if (product === "travel" && details.tripType === "annual") return cover === "annual_multi_trip";
  if (product === "travel" && details.tripType === "single") {
    return cover === "single_trip" || (cover === "schengen" && details.destination === "europe_schengen");
  }
  return true;
}
