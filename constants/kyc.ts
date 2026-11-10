// Demo reference data for KYC screening. A real system would call a screening provider instead.

export const HIGH_RISK_COUNTRIES = ["Freedonia", "Sokovia"];

export const NATIONALITIES = [
  "Pakistan",
  "India",
  "United Kingdom",
  "United States",
  "Egypt",
  "Philippines",
  "Germany",
  ...HIGH_RISK_COUNTRIES,
];

export const PEP_OCCUPATIONS = ["Government official", "Politician", "Senior military officer"];

export const OCCUPATIONS = [
  "Salaried employee",
  "Business owner",
  "Self-employed",
  "Student",
  "Retired",
  ...PEP_OCCUPATIONS,
];

/** Lower-case names on the demo sanctions list. */
export const WATCHLIST = ["ivan fakeman", "carla sanctioned"];

/** Premiums above this raise the risk score. */
export const HIGH_PREMIUM_THRESHOLD = 3000;
