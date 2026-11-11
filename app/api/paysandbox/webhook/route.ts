import { handlePaySandboxEvent } from "@/server/payments/orders";
import { verifyWebhook } from "@/server/payments/webhook";
import { jsonError } from "@/server/website/http";

/** Payment events are a couple of KB; anything far bigger is not from PaySandbox. */
const MAX_BODY_BYTES = 64 * 1024;

// PaySandbox → PolicyDesk. The signature covers the raw bytes, so the body is read as text before any parsing.
export async function POST(req: Request) {
  const secret = process.env.PAYSANDBOX_WEBHOOK_SECRET;
  if (!secret) return jsonError(503, "webhooks_disabled");

  const raw = await req.text();
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return jsonError(413, "too_large");
  const event = verifyWebhook(raw, req.headers, secret);
  if (!event) return jsonError(401, "unauthorized");

  // Once verified it is always 200, even for events PolicyDesk ignores, so PaySandbox stops retrying
  const { duplicate } = await handlePaySandboxEvent(req.headers.get("webhook-id")!, event);
  return Response.json(duplicate ? { received: true, duplicate: true } : { received: true });
}
