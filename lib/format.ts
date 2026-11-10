export const CURRENCY = "USD";

export function money(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 }).format(
    amount,
  );
}

export function shortDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
