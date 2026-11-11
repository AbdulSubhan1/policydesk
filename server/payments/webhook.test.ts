import { Webhook } from "standardwebhooks";
import { describe, expect, it } from "vitest";
import { verifyWebhook } from "./webhook";

// Base64 of 24 fixed bytes, in the whsec_ format PaySandbox hands out
const SECRET = `whsec_${Buffer.alloc(24, 7).toString("base64")}`;
const EVENT = {
  id: "evt_test_000000000000000000000001",
  object: "event",
  type: "payment.succeeded",
  created: 1_700_000_000,
  livemode: false,
  data: {
    object: {
      id: "pay_test_00000000000000000001",
      status: "succeeded",
      amount: 120000,
      checkout_session: "cs_test_000000000000000000000001",
      failure_code: null,
      decline_code: null,
    },
  },
};
const BODY = JSON.stringify(EVENT);

function headers(at = new Date(), secret = SECRET, body = BODY) {
  const msgId = "evt_test_000000000000000000000001";
  return new Headers({
    "webhook-id": msgId,
    "webhook-timestamp": String(Math.floor(at.getTime() / 1000)),
    "webhook-signature": new Webhook(secret).sign(msgId, at, body),
  });
}

describe("verifyWebhook", () => {
  it("accepts a correctly signed event", () => {
    expect(verifyWebhook(BODY, headers(), SECRET)).toMatchObject({
      id: EVENT.id,
      type: "payment.succeeded",
      data: { object: { id: "pay_test_00000000000000000001", checkout_session: "cs_test_000000000000000000000001" } },
    });
  });

  it("rejects a wrong signature", () => {
    const other = `whsec_${Buffer.alloc(24, 9).toString("base64")}`;
    expect(verifyWebhook(BODY, headers(new Date(), other), SECRET)).toBeNull();
    // A body changed after signing fails too
    expect(verifyWebhook(BODY.replace("120000", "100"), headers(), SECRET)).toBeNull();
  });

  it("rejects a stale timestamp", () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000);
    expect(verifyWebhook(BODY, headers(tenMinutesAgo), SECRET)).toBeNull();
  });

  it("rejects missing headers", () => {
    const signed = headers();
    for (const name of ["webhook-id", "webhook-timestamp", "webhook-signature"]) {
      const missing = new Headers(signed);
      missing.delete(name);
      expect(verifyWebhook(BODY, missing, SECRET)).toBeNull();
    }
  });
});
