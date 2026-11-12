import type { APIRequestContext } from "@playwright/test";
import { CLIENT_IP_HEADER } from "../constants/config";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, signRequest } from "../server/website/signature";

/** The secret the test server runs with (playwright.config.ts). */
export const E2E_WEBSITE_SECRET = "e2e-secret";

export const OPPORTUNITIES_PATH = "/api/website/v1/opportunities";

/** The fake PaySandbox (e2e/fake-paysandbox.mjs) and the values it and the test server share; its defaults match. */
export const FAKE_PAYSANDBOX_PORT = 3072;
export const E2E_PAYSANDBOX_KEY = "sk_test_e2e";
/** whsec_ + base64 of the bytes 0..23 */
export const E2E_WEBHOOK_SECRET = "whsec_AAECAwQFBgcICQoLDA0ODxAREhMUFRYX";
/** Where Brokwise runs in its E2E: PaySandbox sends the visitor back here */
export const E2E_WEBSITE_URL = "http://localhost:3100";

/** A random visitor IPv4, so specs don't share one rate-limit bucket. */
export function randomIp() {
  return Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 254)).join(".");
}

/**
 * Calls the website API the way the website does: raw JSON body, timestamp and HMAC signature headers, and the
 * visitor's IP. Each call is a new random visitor unless `ip` is given; `ip: null` sends no IP header.
 */
export function websiteCall(
  request: APIRequestContext,
  method: "GET" | "POST" | "PUT",
  path: string,
  data?: unknown,
  { ip = randomIp() }: { ip?: string | null } = {},
) {
  const body = data === undefined ? "" : JSON.stringify(data);
  const ts = Math.floor(Date.now() / 1000);
  return request.fetch(path, {
    method,
    data: body || undefined,
    headers: {
      "content-type": "application/json",
      [TIMESTAMP_HEADER]: String(ts),
      [SIGNATURE_HEADER]: signRequest(E2E_WEBSITE_SECRET, ts, method, path, body),
      ...(ip === null ? {} : { [CLIENT_IP_HEADER]: ip }),
    },
  });
}

/** Names allow letters only, so make them unique with random letters. */
export function customerName() {
  const letters = Array.from({ length: 6 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");
  return `Webform ${letters[0].toUpperCase()}${letters.slice(1)}`;
}

/** The "Call me back" form: no lead, a coordinator calls. */
export function shortForm(name = customerName()) {
  return {
    form: "short",
    product: "car",
    customerName: name,
    email: `${name.replace(" ", ".").toLowerCase()}@example.com`,
    phone: "+923001234567",
    details: { make: "Toyota", model: "Corolla", year: 2022 },
  };
}

/** The "Get prices now" form: makes the lead that plans are shown for. */
export function fullForm(name = customerName()) {
  const short = shortForm(name);
  return {
    ...short,
    form: "full",
    details: {
      ...short.details,
      gccSpec: true,
      carValue: 18000,
      dateOfBirth: "1990-04-12",
      nationality: "Pakistan",
      city: "Karachi",
      yearsLicensed: 8,
    },
  };
}

/** An ISO day this many days from today (UTC), as the API compares dates. */
export function isoInDays(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

/** Each new product's quick-form field and the rest of its full form (made-up answers that pass every rule). */
export const PRODUCT_DETAILS = {
  travel: {
    quick: { destination: "europe_schengen" },
    full: { tripType: "single", startDate: isoInDays(14), endDate: isoInDays(24), travellers: 2, oldestAge: 45 },
  },
  home: {
    quick: { city: "Karachi" },
    full: { propertyType: "apartment", occupancy: "owner", buildingValue: 250000, contentsValue: 30000 },
  },
  health: {
    quick: { coverFor: "family" },
    full: { children: 2, dateOfBirth: "1986-03-20", city: "Lahore", preExisting: false },
  },
} as const;

export type NewProduct = keyof typeof PRODUCT_DETAILS;

/** A quick ("short") or full form for travel, home or health. */
export function productForm(product: NewProduct, form: "short" | "full" = "full", name = customerName()) {
  const { quick, full } = PRODUCT_DETAILS[product];
  return {
    ...shortForm(name),
    form,
    product,
    details: form === "full" ? { ...quick, ...full } : { ...quick },
  };
}
