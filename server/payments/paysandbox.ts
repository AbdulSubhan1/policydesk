// The PaySandbox REST API (v1). PolicyDesk is the only app that talks to it; the website never sees the key.

const DEFAULT_API_URL = "https://paysandbox.vercel.app/api/v1";

/** A non-2xx answer (or no answer: status 0) from PaySandbox. `code` is PaySandbox's error code when it sent one. */
export class PaySandboxError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`PaySandbox ${status} ${code}`);
  }
}

/** Off until PAYSANDBOX_SECRET_KEY is set: the payment endpoints then answer 503 payments_disabled. */
export function paymentsEnabled() {
  return !!process.env.PAYSANDBOX_SECRET_KEY;
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
  const base = process.env.PAYSANDBOX_API_URL ?? DEFAULT_API_URL;
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${process.env.PAYSANDBOX_SECRET_KEY ?? ""}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new PaySandboxError(0, "network");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new PaySandboxError(res.status, json?.error?.code ?? "unknown");
  return json as T;
}

type SessionObject = {
  id: string;
  url: string;
  status: "open" | "complete" | "expired";
  payment: string | null;
  expires_at: number;
};

/** Creates a hosted checkout. Amounts are in cents; the currency is left out, so the project's (USD) is used. */
export async function createCheckoutSession(input: {
  amountCents: number;
  lineItems: { name: string; quantity: number; amount: number }[];
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  idempotencyKey: string;
}): Promise<{ id: string; url: string; expiresAt: number }> {
  const session = await call<SessionObject>(
    "POST",
    "/checkout_sessions",
    {
      amount: input.amountCents,
      line_items: input.lineItems,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
    },
    input.idempotencyKey,
  );
  return { id: session.id, url: session.url, expiresAt: session.expires_at };
}

export async function getCheckoutSession(
  id: string,
): Promise<{ id: string; status: "open" | "complete" | "expired"; payment: string | null }> {
  const session = await call<SessionObject>("GET", `/checkout_sessions/${encodeURIComponent(id)}`);
  return { id: session.id, status: session.status, payment: session.payment };
}

export async function getPayment(id: string): Promise<{ id: string; status: string; checkoutSession: string }> {
  const payment = await call<{ id: string; status: string; checkout_session: string }>(
    "GET",
    `/payments/${encodeURIComponent(id)}`,
  );
  return { id: payment.id, status: payment.status, checkoutSession: payment.checkout_session };
}
