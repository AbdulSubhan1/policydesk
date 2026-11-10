export const DEPARTMENTS = [
  { name: "Motor & Marine", products: ["car", "bike", "yacht"] },
  { name: "Health", products: ["health"] },
  { name: "Life & Savings", products: ["life", "savings"] },
  { name: "Home & Travel", products: ["home", "travel"] },
  { name: "Business", products: ["business", "cyber", "trade_licence"] },
] as const;

export const PRODUCTS = DEPARTMENTS.flatMap((d) => d.products);
export type Product = (typeof PRODUCTS)[number];

export const PRODUCT_INFO: Record<Product, { label: string; covers: string[] }> = {
  car: { label: "Car", covers: ["Third-party liability", "Comprehensive", "Comprehensive + agency repair"] },
  bike: { label: "Bike", covers: ["Third-party liability", "Comprehensive"] },
  yacht: { label: "Yacht", covers: ["Hull & machinery", "Third-party liability", "Hull + liability"] },
  health: { label: "Health", covers: ["Basic", "Enhanced", "Premium with worldwide cover"] },
  life: { label: "Life", covers: ["Term life", "Whole life", "Critical illness"] },
  savings: { label: "Savings", covers: ["Education plan", "Retirement plan", "Investment-linked plan"] },
  home: { label: "Home", covers: ["Building", "Contents", "Building + contents"] },
  travel: { label: "Travel", covers: ["Single trip", "Annual multi-trip", "Schengen visa cover"] },
  business: {
    label: "Business (SME)",
    covers: ["Property all risks", "Public liability", "Workers' compensation", "Professional indemnity", "Marine cargo"],
  },
  cyber: { label: "Cyber", covers: ["Data breach response", "Cyber liability", "Business interruption"] },
  trade_licence: { label: "Trade licence", covers: ["Licence protection", "Licence + public liability"] },
};

export function productLabel(product: Product) {
  return PRODUCT_INFO[product].label;
}

export function departmentForProduct(product: Product) {
  return DEPARTMENTS.find((d) => (d.products as readonly string[]).includes(product))!.name;
}
