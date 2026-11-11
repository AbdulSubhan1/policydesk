import { CURRENCY } from "@/constants/config";

export function money(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 }).format(
    amount,
  );
}

export function shortDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function dateTime(value: Date | string) {
  return new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

/** b***s@yopmail.com: enough for the customer to recognise, not enough to read off a screen. */
export function maskEmail(email: string) {
  const at = email.lastIndexOf("@");
  const name = email.slice(0, at);
  return `${name.charAt(0)}***${name.length > 1 ? name.charAt(name.length - 1) : ""}${email.slice(at)}`;
}

/** +92 *** ***4568 from an E.164 number (the demo's numbers all start with a 2-digit country code). */
export function maskPhone(phone: string) {
  return `${phone.slice(0, 3)} *** ***${phone.slice(-4)}`;
}

/** Turns a stored value like "needs_analysis" into "Needs analysis". */
export function label(value: string) {
  const text = value.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
