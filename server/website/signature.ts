import { createHmac, timingSafeEqual } from "node:crypto";

// The website signs every call with a secret both apps share. The website repo has a copy of signRequest;
// both test the same fixed vector so they cannot drift apart.

export const TIMESTAMP_HEADER = "x-brokwise-timestamp";
export const SIGNATURE_HEADER = "x-brokwise-signature";

/** How far the request time may be from ours, either way; older captures can't be replayed. */
const MAX_SKEW_SECONDS = 300;

/** Lowercase hex HMAC-SHA256 of `${timestamp}.${METHOD}.${pathAndQuery}.${body}`. */
export function signRequest(secret: string, ts: number, method: string, pathAndQuery: string, body: string) {
  return createHmac("sha256", secret).update(`${ts}.${method.toUpperCase()}.${pathAndQuery}.${body}`).digest("hex");
}

export function verifyRequest(
  req: { method: string; pathAndQuery: string; body: string; timestamp: string | null; signature: string | null },
  secret: string,
  nowSec: number,
) {
  if (!req.timestamp || !req.signature || !/^\d+$/.test(req.timestamp)) return false;
  const ts = Number(req.timestamp);
  if (Math.abs(nowSec - ts) > MAX_SKEW_SECONDS) return false;

  const expected = Buffer.from(signRequest(secret, ts, req.method, req.pathAndQuery, req.body));
  const given = Buffer.from(req.signature);
  // timingSafeEqual throws on different lengths, and a length mismatch is a wrong signature anyway
  return given.length === expected.length && timingSafeEqual(given, expected);
}
