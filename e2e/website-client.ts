import type { APIRequestContext } from "@playwright/test";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, signRequest } from "../server/website/signature";

/** The secret the test server runs with (playwright.config.ts). */
export const E2E_WEBSITE_SECRET = "e2e-secret";

export const OPPORTUNITIES_PATH = "/api/website/v1/opportunities";

/** Calls the website API the way the website does: raw JSON body, timestamp and HMAC signature headers. */
export function websiteCall(request: APIRequestContext, method: "GET" | "POST", path: string, data?: unknown) {
  const body = data === undefined ? "" : JSON.stringify(data);
  const ts = Math.floor(Date.now() / 1000);
  return request.fetch(path, {
    method,
    data: body || undefined,
    headers: {
      "content-type": "application/json",
      [TIMESTAMP_HEADER]: String(ts),
      [SIGNATURE_HEADER]: signRequest(E2E_WEBSITE_SECRET, ts, method, path, body),
    },
  });
}
