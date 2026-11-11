import { Webhook } from "standardwebhooks";
import { z } from "zod";

// PaySandbox signs webhooks with Standard Webhooks: webhook-id (the event id), webhook-timestamp, webhook-signature

const HEADERS = ["webhook-id", "webhook-timestamp", "webhook-signature"] as const;

/** Only the fields PolicyDesk reads; the snapshot has more (card, customer…), which are kept but ignored. */
const eventSchema = z.object({
  id: z.string(),
  type: z.string(),
  created: z.number(),
  data: z.object({
    object: z.object({
      id: z.string(),
      status: z.string().optional(),
      amount: z.number().optional(),
      checkout_session: z.string().optional(),
      failure_code: z.string().nullable().optional(),
      decline_code: z.string().nullable().optional(),
    }),
  }),
});

export type PaySandboxEvent = z.infer<typeof eventSchema>;

/**
 * The event if the signature matches the raw body and the timestamp is within 5 minutes (the library's
 * tolerance, either way); null for anything else, including a signed body that is not an event.
 */
export function verifyWebhook(rawBody: string, headers: Headers, secret: string): PaySandboxEvent | null {
  const values = HEADERS.map((name) => headers.get(name));
  if (values.some((v) => !v)) return null;

  let payload: unknown;
  try {
    payload = new Webhook(secret).verify(rawBody, Object.fromEntries(HEADERS.map((name, i) => [name, values[i]!])));
  } catch {
    return null;
  }
  const parsed = eventSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}
