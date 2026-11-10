import { PRODUCT_CODES, type Product } from "@/constants/products";

// No 0/O or 1/I/L, so a reference read out on a call can't be misheard
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const LENGTH = 7;

/** A new lead reference: the product's short code and 7 random characters, e.g. CAR-J2M3HX7. */
export function leadReference(product: Product) {
  const bytes = crypto.getRandomValues(new Uint8Array(LENGTH));
  return `${PRODUCT_CODES[product]}-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("")}`;
}

/** The nth quote on a lead, e.g. CAR-J2M3HX7-Q2. */
export function quoteReference(leadRef: string, n: number) {
  return `${leadRef}-Q${n}`;
}

/** The lead page link. Links use the UUID, never the numeric id. */
export function leadPath(publicId: string, tab?: string) {
  return tab ? `/leads/${publicId}?tab=${tab}` : `/leads/${publicId}`;
}
