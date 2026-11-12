import { describe, expect, it } from "vitest";
import { fullDetailsSchemaFor, websiteDetailsSchemaFor, websiteOpportunitySchema } from "./website";

const DAY = 86_400_000;
/** An ISO day this many days from today (UTC), like the schema's own "today". */
const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10);
/** A date of birth for someone this many years old. */
const bornYearsAgo = (years: number) => `${new Date().getUTCFullYear() - years}-01-01`;

/** A copy without one field, as if the website never sent it. */
const without = <T extends object>(details: T, key: keyof T) =>
  Object.fromEntries(Object.entries(details).filter(([k]) => k !== key));

const contact = { customerName: "Webform Tester", email: "webform.tester@example.com", phone: "+923001234567" };

const lead = (product: string, details: Record<string, unknown>, form: "short" | "full" = "full") =>
  websiteOpportunitySchema.safeParse({ form, product, ...contact, details });

/** The first problem as the API reports it: the field path and the message key. */
function firstIssue(result: ReturnType<typeof lead>) {
  if (result.success) return null;
  const [issue] = result.error.issues;
  return { field: issue.path.join("."), message: issue.message };
}

const TRAVEL = {
  destination: "europe_schengen",
  tripType: "single",
  startDate: inDays(10),
  endDate: inDays(20),
  travellers: 2,
  oldestAge: 45,
};
const HOME = {
  propertyType: "apartment",
  occupancy: "owner",
  city: "Karachi",
  buildingValue: 250_000,
  contentsValue: 30_000,
};
const HEALTH = {
  coverFor: "family",
  children: 2,
  dateOfBirth: bornYearsAgo(40),
  city: "Lahore",
  preExisting: false,
};

describe("website opportunity schema", () => {
  it("accepts a full form for every product", () => {
    expect(lead("travel", TRAVEL).success).toBe(true);
    expect(lead("home", HOME).success).toBe(true);
    expect(lead("health", HEALTH).success).toBe(true);
  });

  it("accepts the quick form with only its one field", () => {
    expect(lead("travel", { destination: "gcc" }, "short").success).toBe(true);
    expect(lead("home", { city: "Karachi" }, "short").success).toBe(true);
    expect(lead("health", { coverFor: "me" }, "short").success).toBe(true);
  });

  it("unknown product refused", () => {
    for (const product of ["bike", "life", "", undefined]) {
      expect(firstIssue(lead(product as string, TRAVEL))).toEqual({
        field: "product",
        message: "validation.invalidOption",
      });
    }
  });

  it("a field from another product is refused", () => {
    expect(firstIssue(lead("travel", { ...TRAVEL, make: "Toyota" }))).toMatchObject({ field: "details" });
    expect(lead("home", { ...HOME, coverFor: "me" }).success).toBe(false);
  });

  it("full form names the first missing field", () => {
    expect(firstIssue(lead("travel", without(TRAVEL, "travellers")))).toEqual({
      field: "details.travellers",
      message: "validation.required",
    });
  });

  it("travel end before start is refused", () => {
    expect(firstIssue(lead("travel", { ...TRAVEL, startDate: inDays(10), endDate: inDays(9) }))).toEqual({
      field: "details.endDate",
      message: "validation.endBeforeStart",
    });
  });

  it("travel start in the past is refused", () => {
    expect(firstIssue(lead("travel", { ...TRAVEL, startDate: inDays(-1) }))).toEqual({
      field: "details.startDate",
      message: "validation.startInPast",
    });
    expect(lead("travel", { ...TRAVEL, startDate: inDays(0), endDate: inDays(0) }).success).toBe(true);
  });

  it("travel trip longer than 180 days is refused", () => {
    expect(lead("travel", { ...TRAVEL, startDate: inDays(1), endDate: inDays(181) }).success).toBe(true);
    expect(firstIssue(lead("travel", { ...TRAVEL, startDate: inDays(1), endDate: inDays(182) }))).toEqual({
      field: "details.endDate",
      message: "validation.tripTooLong",
    });
  });

  it("travel annual ignores end date", () => {
    // An annual trip needs no end date and has no 180-day limit…
    const annual = without({ ...TRAVEL, tripType: "annual" }, "endDate");
    expect(lead("travel", annual).success).toBe(true);
    // …and an end date sent with one is refused, so nothing contradictory is saved
    expect(firstIssue(lead("travel", { ...annual, endDate: inDays(400) }))).toEqual({
      field: "details.endDate",
      message: "validation.annualNoEndDate",
    });
  });

  it("travel single trip needs an end date", () => {
    expect(firstIssue(lead("travel", without(TRAVEL, "endDate")))).toEqual({
      field: "details.endDate",
      message: "validation.required",
    });
  });

  it("travel travellers 1–9 and oldest age 0–85", () => {
    expect(firstIssue(lead("travel", { ...TRAVEL, travellers: 10 }))?.field).toBe("details.travellers");
    expect(firstIssue(lead("travel", { ...TRAVEL, travellers: 0 }))?.field).toBe("details.travellers");
    expect(firstIssue(lead("travel", { ...TRAVEL, oldestAge: 86 }))?.field).toBe("details.oldestAge");
    expect(lead("travel", { ...TRAVEL, oldestAge: 0 }).success).toBe(true);
  });

  it("travel destination must be a known region", () => {
    expect(firstIssue(lead("travel", { ...TRAVEL, destination: "mars" }))).toEqual({
      field: "details.destination",
      message: "validation.invalidOption",
    });
  });

  it("home tenant needs no building value", () => {
    const tenant = without({ ...HOME, occupancy: "tenant" }, "buildingValue");
    expect(lead("home", tenant).success).toBe(true);
    expect(firstIssue(lead("home", { ...tenant, buildingValue: 250_000 }))).toEqual({
      field: "details.buildingValue",
      message: "validation.ownersOnly",
    });
  });

  it("home owner needs a building value in range", () => {
    expect(firstIssue(lead("home", without(HOME, "buildingValue")))).toEqual({
      field: "details.buildingValue",
      message: "validation.required",
    });
    expect(firstIssue(lead("home", { ...HOME, buildingValue: 9_999 }))?.field).toBe("details.buildingValue");
    expect(firstIssue(lead("home", { ...HOME, contentsValue: 500_001 }))?.field).toBe("details.contentsValue");
  });

  it("health children only for family", () => {
    expect(firstIssue(lead("health", { ...HEALTH, coverFor: "me_spouse" }))).toEqual({
      field: "details.children",
      message: "validation.familyOnly",
    });
    expect(lead("health", without({ ...HEALTH, coverFor: "me_spouse" }, "children")).success).toBe(true);
    expect(firstIssue(lead("health", without(HEALTH, "children")))).toEqual({
      field: "details.children",
      message: "validation.required",
    });
    expect(firstIssue(lead("health", { ...HEALTH, children: 7 }))?.field).toBe("details.children");
  });

  it("health age must be 18 to 75", () => {
    expect(firstIssue(lead("health", { ...HEALTH, dateOfBirth: bornYearsAgo(17) }))).toEqual({
      field: "details.dateOfBirth",
      message: "validation.ageHealth",
    });
    expect(firstIssue(lead("health", { ...HEALTH, dateOfBirth: bornYearsAgo(77) }))?.message).toBe(
      "validation.ageHealth",
    );
  });

  it("car keeps its rules", () => {
    expect(lead("car", { make: "Toyota", model: "Corolla", year: 2022 }, "short").success).toBe(true);
    expect(firstIssue(lead("car", { make: "Toyota", model: "Corolla", year: 2022 }))).toEqual({
      field: "details.gccSpec",
      message: "validation.required",
    });
  });
});

describe("full details for convert", () => {
  it("names the first field still missing", () => {
    const result = fullDetailsSchemaFor("travel").safeParse({ destination: "gcc", tripType: "annual" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: ["startDate"], message: "validation.required" });
  });
});

describe("coordinator details form", () => {
  it("empty boxes are missing answers, yes/no become booleans", () => {
    const result = websiteDetailsSchemaFor("health").safeParse({
      id: 7,
      coverFor: "me",
      children: "",
      dateOfBirth: "",
      city: "",
      preExisting: "no",
    });
    expect(result.success && result.data).toEqual({ id: 7, coverFor: "me", preExisting: false });
  });

  it("checks the same rules across fields", () => {
    const result = websiteDetailsSchemaFor("home").safeParse({
      id: 7,
      propertyType: "",
      occupancy: "tenant",
      city: "Karachi",
      buildingValue: "100000",
      contentsValue: "",
    });
    expect(result.error?.issues[0]).toMatchObject({ path: ["buildingValue"], message: "validation.ownersOnly" });
  });

  it("refuses a field of another product", () => {
    expect(websiteDetailsSchemaFor("travel").safeParse({ id: 7, destination: "gcc", make: "Toyota" }).success).toBe(
      false,
    );
  });
});
