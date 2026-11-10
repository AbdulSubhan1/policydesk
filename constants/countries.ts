// Countries for phone numbers: dialling code and the allowed length of the national number (digits after the code).
// PhoneInput and the phone validator in schemas/fields.ts both read this list.

export type Country = { code: string; name: string; dial: string; flag: string; min: number; max: number };

export const COUNTRIES: Country[] = [
  { code: "AE", name: "United Arab Emirates", dial: "+971", flag: "🇦🇪", min: 8, max: 9 },
  { code: "SA", name: "Saudi Arabia", dial: "+966", flag: "🇸🇦", min: 9, max: 9 },
  { code: "QA", name: "Qatar", dial: "+974", flag: "🇶🇦", min: 8, max: 8 },
  { code: "KW", name: "Kuwait", dial: "+965", flag: "🇰🇼", min: 8, max: 8 },
  { code: "BH", name: "Bahrain", dial: "+973", flag: "🇧🇭", min: 8, max: 8 },
  { code: "OM", name: "Oman", dial: "+968", flag: "🇴🇲", min: 8, max: 8 },
  { code: "PK", name: "Pakistan", dial: "+92", flag: "🇵🇰", min: 10, max: 10 },
  { code: "IN", name: "India", dial: "+91", flag: "🇮🇳", min: 10, max: 10 },
  { code: "EG", name: "Egypt", dial: "+20", flag: "🇪🇬", min: 10, max: 10 },
  { code: "PH", name: "Philippines", dial: "+63", flag: "🇵🇭", min: 10, max: 10 },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧", min: 10, max: 10 },
  { code: "US", name: "United States", dial: "+1", flag: "🇺🇸", min: 10, max: 10 },
  { code: "DE", name: "Germany", dial: "+49", flag: "🇩🇪", min: 10, max: 11 },
];

export const DEFAULT_COUNTRY = "AE";

/** Splits "+971501234567" into its country and national number, matching the longest dialling code. */
export function splitPhone(value: string | null | undefined) {
  const clean = (value ?? "").replace(/[^\d+]/g, "");
  const country = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((c) => clean.startsWith(c.dial));
  return { country, national: country ? clean.slice(country.dial.length) : clean.replace(/^\+/, "") };
}
