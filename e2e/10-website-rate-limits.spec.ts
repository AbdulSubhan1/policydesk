import { randomBytes } from "node:crypto";
import { expect, test, type APIRequestContext, type APIResponse } from "@playwright/test";
import { CLIENT_IP_HEADER, RATE_LIMITS_PER_HOUR } from "../constants/config";
import { OPPORTUNITIES_PATH, randomIp, shortForm, websiteCall } from "./website-client";

// Per-visitor-IP limits on the website API (default config). Each test uses its own IPs, picked per run, so a rerun
// within the same hour against a reused server starts from empty buckets.

const WEBHOOK_PATH = "/api/paysandbox/webhook";
const LEADS = RATE_LIMITS_PER_HOUR.lead;
const LINK_OPENS = RATE_LIMITS_PER_HOUR.link;

const lead = (request: APIRequestContext, ip: string | null) =>
  websiteCall(request, "POST", OPPORTUNITIES_PATH, shortForm(), { ip });

async function expectRateLimited(res: APIResponse) {
  expect(res.status()).toBe(429);
  expect(await res.json()).toEqual({ error: { code: "rate_limited" } });
  const retryAfter = Number(res.headers()["retry-after"]);
  expect(Number.isInteger(retryAfter)).toBe(true);
  expect(retryAfter).toBeGreaterThan(0);
  expect(retryAfter).toBeLessThanOrEqual(3600);
}

test.describe.serial("website rate limits", () => {
  const blockedIp = randomIp();

  test("sixth lead from one IP → 429 with Retry-After", async ({ request }) => {
    for (let i = 0; i < LEADS; i++) expect((await lead(request, blockedIp)).status()).toBe(201);
    await expectRateLimited(await lead(request, blockedIp));
  });

  test("another IP is not blocked", async ({ request }) => {
    await expectRateLimited(await lead(request, blockedIp));
    expect((await lead(request, randomIp())).status()).toBe(201);
  });

  test("unsigned calls are refused before they are counted", async ({ request }) => {
    const ip = randomIp();
    for (let i = 0; i < LEADS * 2; i++) {
      const res = await request.post(OPPORTUNITIES_PATH, { data: shortForm(), headers: { [CLIENT_IP_HEADER]: ip } });
      expect(res.status()).toBe(401);
    }
    for (let i = 0; i < LEADS; i++) expect((await lead(request, ip)).status()).toBe(201);
  });

  test("a missing or garbage IP shares one unknown bucket", async ({ request }) => {
    // The bucket may already hold calls from an earlier run this hour, so fill it until it refuses
    let res = await lead(request, "not-an-ip");
    for (let i = 0; i < LEADS && res.status() === 201; i++) res = await lead(request, "not-an-ip");
    await expectRateLimited(res);
    await expectRateLimited(await lead(request, null));
    await expectRateLimited(await lead(request, "999.1.1.1"));
    expect((await lead(request, randomIp())).status()).toBe(201);
  });

  test("pay-link opens are limited", async ({ request }) => {
    const ip = randomIp();
    const openPath = () => `/api/website/v1/pay-links/${randomBytes(32).toString("base64url")}/open`;
    const open = () => websiteCall(request, "POST", openPath(), undefined, { ip });
    // Unknown tokens still count, so nobody can guess tokens faster than the limit
    for (let i = 0; i < LINK_OPENS; i++) expect((await open()).status()).toBe(404);
    await expectRateLimited(await open());
  });

  test("webhook is never limited", async ({ request }) => {
    const ip = randomIp();
    for (let i = 0; i < 30; i++) {
      const res = await request.post(WEBHOOK_PATH, { data: "{}", headers: { [CLIENT_IP_HEADER]: ip } });
      expect(res.status()).toBe(401);
    }
  });
});
