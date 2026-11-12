import type { Localized } from "./i18n";
import type { WebsiteProduct } from "./website";

/** included = always on at no cost; optional = off by default; preselected = on by default, the customer may untick it. */
export const ADD_ON_KINDS = ["included", "optional", "preselected"] as const;
export type AddOnKind = (typeof ADD_ON_KINDS)[number];

/** What a quote keeps of each add-on, copied like the plan name so old quotes stay correct. */
export type QuoteAddOn = { key: string; name: Localized; kind: AddOnKind; price: number };

type AddOnSeed = { key: string; name: Localized; price: number };

// Made-up add-ons of each website product with their yearly price in whole dollars. Which plan gets which, and as
// which kind, is set in server/website/catalogue.ts.

export const CAR_ADD_ONS = [
  { key: "roadside_assistance", name: { en: "Roadside assistance", ar: "المساعدة على الطريق" }, price: 25 },
  { key: "replacement_car", name: { en: "Replacement car", ar: "سيارة بديلة" }, price: 60 },
  { key: "driver_accident", name: { en: "Personal accident for the driver", ar: "حوادث شخصية للسائق" }, price: 30 },
  { key: "passenger_accident", name: { en: "Personal accident for passengers", ar: "حوادث شخصية للركاب" }, price: 45 },
  { key: "windscreen", name: { en: "Windscreen cover", ar: "تغطية الزجاج الأمامي" }, price: 35 },
  { key: "regional_cover", name: { en: "Regional cover (GCC)", ar: "تغطية إقليمية (الخليج)" }, price: 80 },
] as const satisfies readonly AddOnSeed[];

export const TRAVEL_ADD_ONS = [
  { key: "trip_cancellation", name: { en: "Trip cancellation", ar: "إلغاء الرحلة" }, price: 25 },
  { key: "baggage_delay", name: { en: "Baggage delay", ar: "تأخر الأمتعة" }, price: 10 },
  { key: "adventure_sports", name: { en: "Adventure sports", ar: "الرياضات المغامرة" }, price: 30 },
  { key: "covid_cover", name: { en: "COVID-19 cover", ar: "تغطية كوفيد-19" }, price: 15 },
] as const satisfies readonly AddOnSeed[];

export const HOME_ADD_ONS = [
  { key: "accidental_damage", name: { en: "Accidental damage", ar: "الأضرار العرضية" }, price: 40 },
  { key: "valuables_away", name: { en: "Valuables away from home", ar: "المقتنيات الثمينة خارج المنزل" }, price: 35 },
  { key: "alternative_accommodation", name: { en: "Alternative accommodation", ar: "سكن بديل" }, price: 25 },
  { key: "domestic_helper", name: { en: "Domestic helper cover", ar: "تغطية العمالة المنزلية" }, price: 20 },
] as const satisfies readonly AddOnSeed[];

export const HEALTH_ADD_ONS = [
  { key: "dental", name: { en: "Dental", ar: "الأسنان" }, price: 90 },
  { key: "optical", name: { en: "Optical", ar: "البصريات" }, price: 60 },
  { key: "maternity", name: { en: "Maternity", ar: "الأمومة" }, price: 150 },
  { key: "wellness_checkup", name: { en: "Wellness check-up", ar: "فحص صحي دوري" }, price: 0 },
] as const satisfies readonly AddOnSeed[];

export const WEBSITE_ADD_ONS = {
  car: CAR_ADD_ONS,
  travel: TRAVEL_ADD_ONS,
  home: HOME_ADD_ONS,
  health: HEALTH_ADD_ONS,
} as const satisfies Record<WebsiteProduct, readonly AddOnSeed[]>;

export type AddOnKey<P extends WebsiteProduct> = (typeof WEBSITE_ADD_ONS)[P][number]["key"];
