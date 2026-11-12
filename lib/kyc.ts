import {
  HIGH_PREMIUM_THRESHOLD,
  HIGH_RISK_COUNTRIES,
  NATIONALITIES,
  PEP_OCCUPATIONS,
  WATCHLIST,
} from "@/constants/kyc";
import type { RiskRating, SourceOfFunds } from "@/constants/statuses";

export type ScreeningInput = {
  customerName: string;
  nationality: string;
  occupation: string;
  sourceOfFunds: SourceOfFunds;
  idExpiry: string;
  highestPremium: number;
};

export type ScreeningResult = {
  isPep: boolean;
  watchlistMatch: boolean;
  riskRating: RiskRating;
  riskReasons: string[];
  eddRequired: boolean;
};

/** Simulated sanctions / PEP screening and risk scoring. */
export function screenCustomer(input: ScreeningInput, today = new Date()): ScreeningResult {
  const reasons: string[] = [];
  let score = 0;

  const watchlistMatch = WATCHLIST.includes(input.customerName.trim().toLowerCase());
  if (watchlistMatch) {
    score += 3;
    reasons.push("Name matches a sanctions watchlist entry");
  }

  const isPep = PEP_OCCUPATIONS.includes(input.occupation);
  if (isPep) {
    score += 2;
    reasons.push("Politically exposed person (PEP)");
  }

  if (HIGH_RISK_COUNTRIES.includes(input.nationality)) {
    score += 3;
    reasons.push(`High-risk jurisdiction: ${input.nationality}`);
  }

  if (input.sourceOfFunds === "cash") {
    score += 1;
    reasons.push("Source of funds is cash");
  }

  if (input.highestPremium > HIGH_PREMIUM_THRESHOLD) {
    score += 1;
    reasons.push("High premium amount");
  }

  const idExpired = new Date(input.idExpiry) < today;
  if (idExpired) reasons.push("ID document has expired");

  const riskRating: RiskRating = score >= 3 ? "high" : score >= 1 ? "medium" : "low";

  return {
    isPep,
    watchlistMatch,
    riskRating,
    riskReasons: reasons,
    eddRequired: riskRating === "high" || watchlistMatch || idExpired,
  };
}

/** KYC fields the website form can already answer. */
export type KycPrefill = { nationality?: string; dateOfBirth?: string };

/**
 * Starting values for the KYC form from the answers the website stored on the opportunity. What the advisor saved
 * before (after a rejection or a renewal) wins; a website answer is used only where nothing was saved, and only when
 * the form can take it: a nationality on the screening list and a real YYYY-MM-DD date of birth.
 */
export function kycPrefill(
  details: Record<string, unknown>,
  saved: { nationality: string | null; dateOfBirth: string | null },
): { values: KycPrefill; fromWebsite: (keyof KycPrefill)[] } {
  const values: KycPrefill = {};
  const typed = typeof details.nationality === "string" ? details.nationality.trim().toLowerCase() : "";
  const nationality = NATIONALITIES.find((n) => n.toLowerCase() === typed);
  if (!saved.nationality && nationality) values.nationality = nationality;
  const dob = details.dateOfBirth;
  if (
    !saved.dateOfBirth &&
    typeof dob === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(dob) &&
    !Number.isNaN(Date.parse(dob))
  ) {
    values.dateOfBirth = dob;
  }
  return { values, fromWebsite: Object.keys(values) as (keyof KycPrefill)[] };
}
