import { HIGH_PREMIUM_THRESHOLD, HIGH_RISK_COUNTRIES, PEP_OCCUPATIONS, WATCHLIST } from "@/constants/kyc";
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
