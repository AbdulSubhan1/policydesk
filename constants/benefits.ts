import type { WebsiteProduct } from "./website";

// Made-up benefits of each website product's plans, in English like the rest of the plan data. Seeded plans pick
// from their own product's list (server/website/benefits.ts), so a travel plan never offers roadside assistance.

export const PLAN_BENEFITS: Record<WebsiteProduct, readonly string[]> = {
  car: [
    "24/7 claims helpline",
    "Cashless network",
    "Free cancellation in 14 days",
    "Personal accident cover",
    "Roadside assistance",
    "Legal expenses",
  ],
  travel: [
    "Emergency medical cover",
    "Trip delay cover",
    "Lost baggage cover",
    "24/7 travel assistance",
    "Personal liability abroad",
    "Schengen visa approved",
  ],
  home: [
    "Fire and flood cover",
    "Theft cover",
    "Temporary accommodation",
    "Emergency repairs",
    "Public liability",
    "Locks and keys",
  ],
  health: [
    "Hospital stays",
    "Specialist visits",
    "Prescribed medicines",
    "Emergency care",
    "Day-case surgery",
    "Direct billing at partner hospitals",
  ],
};
