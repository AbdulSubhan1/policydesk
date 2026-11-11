// A stand-in for PaySandbox in E2E runs (PolicyDesk's and Brokwise's): the API calls PolicyDesk makes, a hosted
// checkout page with Pay buttons, and a signed payment.succeeded webhook back to PolicyDesk. Everything is kept in
// memory, so a restart forgets it. Run: node e2e/fake-paysandbox.mjs
//
// Env (defaults match playwright.config.ts and e2e/website-client.ts):
//   FAKE_PAYSANDBOX_PORT        3072
//   PAYSANDBOX_SECRET_KEY       sk_test_e2e
//   PAYSANDBOX_WEBHOOK_SECRET   whsec_ + base64 of the bytes 0..23
//   E2E_PORT                    PolicyDesk's port (3070); webhooks go to its /api/paysandbox/webhook
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { Webhook } from "standardwebhooks";

const PORT = Number(process.env.FAKE_PAYSANDBOX_PORT ?? 3072);
const SECRET_KEY = process.env.PAYSANDBOX_SECRET_KEY ?? "sk_test_e2e";
const WEBHOOK_SECRET = process.env.PAYSANDBOX_WEBHOOK_SECRET ?? "whsec_AAECAwQFBgcICQoLDA0ODxAREhMUFRYX";
const WEBHOOK_URL = `http://localhost:${process.env.E2E_PORT ?? 3070}/api/paysandbox/webhook`;
const BASE = `http://localhost:${PORT}`;
const DAY = 86_400;

const sessions = new Map();
const payments = new Map();
const idempotent = new Map();

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const newId = (prefix) => prefix + Array.from(randomBytes(24), (b) => ALPHABET[b % ALPHABET.length]).join("");
const now = () => Math.floor(Date.now() / 1000);

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

const apiError = (res, status, type, code) => json(res, status, { error: { type, code, message: code } });

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function createSession(body) {
  const id = newId("cs_test_");
  const session = {
    id,
    object: "checkout_session",
    url: `${BASE}/c/${id}`,
    amount: body.amount,
    currency: "usd",
    line_items: body.line_items,
    customer_email: body.customer_email ?? null,
    success_url: body.success_url,
    cancel_url: body.cancel_url,
    status: "open",
    payment: null,
    expires_at: now() + DAY,
    created: now(),
    livemode: false,
  };
  sessions.set(id, session);
  return session;
}

async function sendWebhook(type, payment) {
  const event = {
    id: newId("evt_"),
    object: "event",
    type,
    created: now(),
    livemode: false,
    data: { object: payment },
  };
  const body = JSON.stringify(event);
  const at = new Date();
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "webhook-id": event.id,
        "webhook-timestamp": String(Math.floor(at.getTime() / 1000)),
        "webhook-signature": new Webhook(WEBHOOK_SECRET).sign(event.id, at, body),
      },
      body,
    });
    console.log(`webhook ${type} ${event.id} → ${res.status}`);
  } catch (e) {
    console.error(`webhook ${type} failed: ${e.message}`);
  }
}

function checkoutPage(session) {
  const lines = session.line_items.map((l) => `<li>${l.name}: $${(l.amount / 100).toFixed(2)}</li>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Fake PaySandbox checkout</title></head><body>
<h1>Fake PaySandbox</h1><p>Total $${(session.amount / 100).toFixed(2)} · ${session.status}</p><ul>${lines}</ul>
<form method="post" action="/c/${session.id}/pay"><button type="submit">Pay</button></form>
<form method="post" action="/c/${session.id}/pay?webhook=0"><button type="submit">Pay without webhook</button></form>
<p><a href="${session.cancel_url}">Cancel</a></p></body></html>`;
}

async function pay(session, withWebhook) {
  const payment = {
    id: newId("pay_"),
    object: "payment",
    amount: session.amount,
    amount_refunded: 0,
    currency: "usd",
    status: "succeeded",
    customer: { id: "cus_e2e", name: "E2E Payer", email: session.customer_email ?? "payer@yopmail.com" },
    card: { brand: "visa", last4: "4242" },
    failure_code: null,
    decline_code: null,
    checkout_session: session.id,
    created: now(),
    livemode: false,
  };
  payments.set(payment.id, payment);
  session.status = "complete";
  session.payment = payment.id;
  // Awaited, so the visitor lands on the thank-you page after PolicyDesk has the webhook (unless skipped)
  if (withWebhook) await sendWebhook("payment.succeeded", payment);
  return payment;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  const path = url.pathname;

  if (path === "/health") return json(res, 200, { ok: true });

  if (path.startsWith("/api/v1/")) {
    if (req.headers.authorization !== `Bearer ${SECRET_KEY}`) {
      return apiError(res, 401, "authentication_error", "invalid_api_key");
    }
    if (req.method === "POST" && path === "/api/v1/checkout_sessions") {
      const key = req.headers["idempotency-key"];
      if (key && idempotent.has(key)) return json(res, 200, sessions.get(idempotent.get(key)));
      let body;
      try {
        body = JSON.parse(await readBody(req));
      } catch {
        return apiError(res, 400, "invalid_request_error", "invalid_json");
      }
      if (!Number.isInteger(body.amount) || body.amount < 100 || body.amount > 500_000) {
        return apiError(res, 400, "invalid_request_error", "amount_invalid");
      }
      if (!Array.isArray(body.line_items) || !body.success_url || !body.cancel_url) {
        return apiError(res, 400, "invalid_request_error", "parameter_missing");
      }
      const session = createSession(body);
      if (key) idempotent.set(key, session.id);
      return json(res, 200, session);
    }
    const [, , , kind, id] = path.split("/");
    const found = req.method === "GET" && (kind === "checkout_sessions" ? sessions : payments).get(id);
    return found ? json(res, 200, found) : apiError(res, 404, "invalid_request_error", "resource_missing");
  }

  const checkout = /^\/c\/([^/]+)(\/pay)?$/.exec(path);
  const session = checkout && sessions.get(checkout[1]);
  if (!session) {
    res.writeHead(404, { "content-type": "text/plain" });
    return res.end("Not found");
  }
  if (req.method === "GET" && !checkout[2]) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(checkoutPage(session));
  }
  if (req.method === "POST" && checkout[2]) {
    if (session.status !== "open") {
      res.writeHead(409, { "content-type": "text/plain" });
      return res.end(`Session is ${session.status}`);
    }
    const payment = await pay(session, url.searchParams.get("webhook") !== "0");
    const back = new URL(session.success_url);
    back.searchParams.set("pay", payment.id);
    res.writeHead(303, { location: back.toString() });
    return res.end();
  }
  res.writeHead(405);
  res.end();
});

server.listen(PORT, () => console.log(`Fake PaySandbox on ${BASE}, webhooks to ${WEBHOOK_URL}`));
