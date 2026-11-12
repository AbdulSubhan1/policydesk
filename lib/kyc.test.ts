import { describe, expect, it } from "vitest";
import { kycPrefill } from "./kyc";

const NOTHING_SAVED = { nationality: null, dateOfBirth: null };

describe("kycPrefill", () => {
  it("takes the nationality and date of birth from the website's answers", () => {
    expect(
      kycPrefill({ nationality: " pakistan ", dateOfBirth: "1992-04-10", city: "Karachi" }, NOTHING_SAVED),
    ).toEqual({
      values: { nationality: "Pakistan", dateOfBirth: "1992-04-10" },
      fromWebsite: ["nationality", "dateOfBirth"],
    });
  });

  it("skips answers the form can't take", () => {
    // A nationality outside the screening list, and dates that aren't YYYY-MM-DD days
    expect(kycPrefill({ nationality: "Atlantis", dateOfBirth: "10/04/1992" }, NOTHING_SAVED)).toEqual({
      values: {},
      fromWebsite: [],
    });
    expect(kycPrefill({ dateOfBirth: "1992-13-45" }, NOTHING_SAVED).fromWebsite).toEqual([]);
    expect(kycPrefill({ nationality: 42, dateOfBirth: true }, NOTHING_SAVED).fromWebsite).toEqual([]);
  });

  it("keeps what the advisor saved before", () => {
    expect(
      kycPrefill({ nationality: "India", dateOfBirth: "1992-04-10" }, { nationality: "Egypt", dateOfBirth: null }),
    ).toEqual({ values: { dateOfBirth: "1992-04-10" }, fromWebsite: ["dateOfBirth"] });
  });

  it("has nothing for an opportunity typed in by hand", () => {
    expect(kycPrefill({}, NOTHING_SAVED)).toEqual({ values: {}, fromWebsite: [] });
  });
});
