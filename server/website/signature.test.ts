import { describe, expect, it } from "vitest";
import { signRequest, verifyRequest } from "./signature";

const SECRET = "test-secret";
const NOW = 1_700_000_000;
const PATH = "/api/website/v1/opportunities";
const BODY = '{"a":1}';

function signed(ts = NOW, body = BODY) {
  return {
    method: "POST",
    pathAndQuery: PATH,
    body,
    timestamp: String(ts),
    signature: signRequest(SECRET, ts, "POST", PATH, body),
  };
}

describe("verifyRequest", () => {
  it("matches the vector shared with the website", () => {
    // The website repo asserts the same hex, so both sides sign identically
    expect(signRequest(SECRET, NOW, "POST", PATH, BODY)).toBe(
      "2a402a7a72ab3367c024b9e1c775022ccd58dcf1bbb70c250298cf2241621d65",
    );
  });

  it("accepts a fresh, correct signature", () => {
    expect(verifyRequest(signed(), SECRET, NOW)).toBe(true);
  });

  it("rejects a missing header", () => {
    expect(verifyRequest({ ...signed(), signature: null }, SECRET, NOW)).toBe(false);
    expect(verifyRequest({ ...signed(), timestamp: null }, SECRET, NOW)).toBe(false);
  });

  it("rejects a wrong signature", () => {
    expect(verifyRequest({ ...signed(), signature: signRequest("other", NOW, "POST", PATH, BODY) }, SECRET, NOW)).toBe(
      false,
    );
    expect(verifyRequest({ ...signed(), signature: "abc" }, SECRET, NOW)).toBe(false);
  });

  it("rejects a body changed after signing", () => {
    expect(verifyRequest({ ...signed(), body: '{"a":2}' }, SECRET, NOW)).toBe(false);
  });

  it("rejects a timestamp 301 s old", () => {
    expect(verifyRequest(signed(NOW - 301), SECRET, NOW)).toBe(false);
  });

  it("rejects a timestamp 301 s in the future", () => {
    expect(verifyRequest(signed(NOW + 301), SECRET, NOW)).toBe(false);
  });

  it("accepts exactly 300 s old", () => {
    expect(verifyRequest(signed(NOW - 300), SECRET, NOW)).toBe(true);
  });

  it("rejects a non-numeric timestamp", () => {
    const req = signed();
    const sig = signRequest(SECRET, NaN, "POST", PATH, BODY);
    expect(verifyRequest({ ...req, timestamp: "soon", signature: sig }, SECRET, NOW)).toBe(false);
    expect(verifyRequest({ ...req, timestamp: `${NOW}abc` }, SECRET, NOW)).toBe(false);
  });
});
