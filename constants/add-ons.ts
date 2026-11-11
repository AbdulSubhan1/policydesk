import type { Localized } from "./i18n";

/** included = always on at no cost; optional = off by default; preselected = on by default, the customer may untick it. */
export const ADD_ON_KINDS = ["included", "optional", "preselected"] as const;
export type AddOnKind = (typeof ADD_ON_KINDS)[number];

/** What a quote keeps of each add-on, copied like the plan name so old quotes stay correct. */
export type QuoteAddOn = { key: string; name: Localized; kind: AddOnKind; price: number };

/** Made-up car add-ons with their yearly price in whole dollars. Which plan gets which is set in server/website/catalogue.ts. */
export const CAR_ADD_ONS = [
  { key: "roadside_assistance", name: { en: "Roadside assistance", ar: "المساعدة على الطريق" }, price: 25 },
  { key: "replacement_car", name: { en: "Replacement car", ar: "سيارة بديلة" }, price: 60 },
  { key: "driver_accident", name: { en: "Personal accident for the driver", ar: "حوادث شخصية للسائق" }, price: 30 },
  { key: "passenger_accident", name: { en: "Personal accident for passengers", ar: "حوادث شخصية للركاب" }, price: 45 },
  { key: "windscreen", name: { en: "Windscreen cover", ar: "تغطية الزجاج الأمامي" }, price: 35 },
  { key: "regional_cover", name: { en: "Regional cover (GCC)", ar: "تغطية إقليمية (الخليج)" }, price: 80 },
] as const satisfies readonly { key: string; name: Localized; price: number }[];

export type CarAddOnKey = (typeof CAR_ADD_ONS)[number]["key"];
