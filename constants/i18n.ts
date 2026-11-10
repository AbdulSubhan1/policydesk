export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "pd_locale";
export const RTL_LOCALES: Locale[] = ["ar"];

export const LOCALE_NAMES: Record<Locale, string> = { en: "English", ar: "العربية" };

/** Text stored in the database in several languages. English is always present. */
export type Localized = { en: string } & Partial<Record<Locale, string>>;
