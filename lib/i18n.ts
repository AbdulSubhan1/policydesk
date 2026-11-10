import { DEFAULT_LOCALE, LOCALES, type Locale, type Localized } from "@/constants/i18n";

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

/** Picks the translation for a database value, falling back to English. */
export function localized(value: Localized | null | undefined, locale: string) {
  if (!value) return "";
  return (isLocale(locale) && value[locale]) || value[DEFAULT_LOCALE];
}
