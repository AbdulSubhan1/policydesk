import { PRODUCT_COVERS, type Product } from "./products";
import type { WebsiteProduct } from "./website";

// What a plan lists as included. The website's products get their own lists so a travel plan never shows a car
// benefit, and no benefit repeats an add-on sold on the same plan (constants/add-ons.ts). Other products share one
// list. Plans are made-up demo data: setup-db.ts seeds them, scripts/update-catalogue.ts refreshes live plans.

/** Every plan of the product lists these first: what the website's product page promises. */
const CORE: Record<WebsiteProduct, readonly string[]> = {
  car: ["24/7 claims helpline"],
  travel: ["Emergency medical care abroad", "Emergency evacuation", "Lost or stolen baggage"],
  home: ["Fire, flood, storm and burst pipes", "Theft and break-ins"],
  health: ["Hospital stays and surgery", "Doctor visits and prescribed medicines"],
};

/** Extras a plan may add, more on the higher covers. */
const EXTRAS: Record<WebsiteProduct, readonly string[]> = {
  car: [
    "Cashless repairs at partner garages",
    "Free cancellation in 14 days",
    "Legal expenses",
    "Natural disaster damage",
    "New car replacement in the first year",
  ],
  travel: ["24/7 travel helpline", "Lost passport help", "Personal liability abroad", "Flight delay cash"],
  home: ["24/7 emergency repairs line", "Public liability", "Lock and key replacement", "Garden and outbuildings"],
  health: ["Cashless hospital network", "Emergency ambulance", "Second medical opinion", "Physiotherapy"],
};

/** The shared list for products the website doesn't sell. */
const GENERIC = [
  "24/7 claims helpline",
  "Cashless network",
  "Free cancellation in 14 days",
  "Worldwide cover",
  "Personal accident cover",
  "Roadside assistance",
  "Legal expenses",
  "Emergency evacuation",
] as const;

/** A stable number from the insurer's name, so the same insurer gets the same extras in every database. */
const nameSeed = (name: string) => [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);

/**
 * A plan's benefits from its product, cover and insurer. Higher covers (later in PRODUCT_COVERS) get more extras;
 * which ones rotates by insurer, so plans of the same cover differ a little.
 */
export function planBenefits(product: Product, cover: string, insurer: string): string[] {
  const tier = Math.max(0, PRODUCT_COVERS[product].indexOf(cover));
  const seed = nameSeed(insurer);
  if (!(product in CORE)) {
    return GENERIC.filter((_, b) => (b + seed + tier) % 3 === 0).slice(0, 2 + tier);
  }
  const extras = EXTRAS[product as WebsiteProduct];
  const picked = Array.from(
    { length: Math.min(1 + tier, extras.length) },
    (_, i) => extras[(seed + i) % extras.length],
  );
  return [...CORE[product as WebsiteProduct], ...picked];
}
