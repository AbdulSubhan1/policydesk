// Departments, the products each one sells, and the cover types of every product.
// Only keys live here; their labels are in messages/<locale>.json under "departments", "products" and "covers".

export const DEPARTMENTS = [
  { key: "motor_marine", products: ["car", "bike", "yacht"] },
  { key: "health", products: ["health"] },
  { key: "life_savings", products: ["life", "savings"] },
  { key: "home_travel", products: ["home", "travel"] },
  { key: "business", products: ["business", "cyber", "trade_licence"] },
] as const;

export type DepartmentKey = (typeof DEPARTMENTS)[number]["key"];
export type Product = (typeof DEPARTMENTS)[number]["products"][number];

export const PRODUCTS = DEPARTMENTS.flatMap((d) => d.products) as [Product, ...Product[]];

export const PRODUCT_COVERS: Record<Product, readonly string[]> = {
  car: ["third_party", "comprehensive", "comprehensive_agency"],
  bike: ["third_party", "comprehensive"],
  yacht: ["hull_machinery", "third_party", "hull_liability"],
  health: ["health_basic", "health_enhanced", "health_premium"],
  life: ["term_life", "whole_life", "critical_illness"],
  savings: ["education_plan", "retirement_plan", "investment_plan"],
  home: ["building", "contents", "building_contents"],
  travel: ["single_trip", "annual_multi_trip", "schengen"],
  business: [
    "property_all_risks",
    "public_liability",
    "workers_compensation",
    "professional_indemnity",
    "marine_cargo",
  ],
  cyber: ["data_breach", "cyber_liability", "business_interruption"],
  trade_licence: ["licence_protection", "licence_liability"],
};

export function departmentOf(product: Product): DepartmentKey {
  return DEPARTMENTS.find((d) => (d.products as readonly string[]).includes(product))!.key;
}
