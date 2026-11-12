import { expect, test, type APIRequestContext } from "@playwright/test";
import { Webhook } from "standardwebhooks";
import { SAMPLE_PNG, loginAs, pick, pickDate } from "./helpers";
import {
  E2E_PAYSANDBOX_KEY,
  E2E_WEBHOOK_SECRET,
  FAKE_PAYSANDBOX_PORT,
  OPPORTUNITIES_PATH,
  customerName,
  fullForm,
  websiteCall,
} from "./website-client";

// Self-serve payment against the fake PaySandbox (e2e/fake-paysandbox.mjs), which PolicyDesk calls for sessions and
// which posts signed webhooks back. Paying here posts the fake's Pay form without following the redirect to Brokwise.

type AddOn = { id: number; name: string; kind: "included" | "optional" | "preselected"; price: number };
type Plan = { id: number; insurer: string; name: string; cover: string; basePremium: number; addOns: AddOn[] };
type Selection = { quoteReference: string; total: number };

const FAKE = `http://localhost:${FAKE_PAYSANDBOX_PORT}`;
const CHECKOUT_URL = new RegExp(`^${FAKE}/c/(cs_test_[0-9A-Za-z]{24})$`);
const WEBHOOK_PATH = "/api/paysandbox/webhook";

const paymentPath = (publicId: string) => `${OPPORTUNITIES_PATH}/${publicId}/payment`;
const orderPath = (publicId: string) => `${OPPORTUNITIES_PATH}/${publicId}/order`;
const sessionId = (checkoutUrl: string) => CHECKOUT_URL.exec(checkoutUrl)![1];

function select(request: APIRequestContext, publicId: string, planId: number, addOnIds: number[]) {
  return websiteCall(request, "PUT", `${OPPORTUNITIES_PATH}/${publicId}/selection`, { planId, addOnIds });
}

/** A full-form lead that picked a comprehensive plan with one optional add-on. */
async function leadWithSelection(request: APIRequestContext) {
  const name = customerName();
  const created = await (await websiteCall(request, "POST", OPPORTUNITIES_PATH, fullForm(name))).json();
  const publicId: string = created.opportunity.publicId;
  const { plans } = await (await websiteCall(request, "GET", `${OPPORTUNITIES_PATH}/${publicId}/plans`)).json();
  const plan = (plans as Plan[]).find((p) => p.cover === "comprehensive")!;
  const optional = plan.addOns.find((a) => a.kind === "optional")!;
  const selection: Selection = (await (await select(request, publicId, plan.id, [optional.id])).json()).selection;
  return { name, publicId, reference: created.lead.reference as string, plan, optional, selection };
}

const startPayment = (request: APIRequestContext, publicId: string) =>
  websiteCall(request, "POST", paymentPath(publicId), {});

async function checkoutUrlOf(request: APIRequestContext, publicId: string) {
  const res = await startPayment(request, publicId);
  expect(res.status()).toBe(200);
  return (await res.json()).checkoutUrl as string;
}

async function getOrder(request: APIRequestContext, publicId: string) {
  const res = await websiteCall(request, "GET", orderPath(publicId));
  expect(res.status()).toBe(200);
  return res.json();
}

/** Presses Pay on the fake checkout; returns the pay_ id PaySandbox adds to the success URL. */
async function pay(request: APIRequestContext, checkoutUrl: string, { webhook = true } = {}) {
  const res = await request.post(`${checkoutUrl}/pay${webhook ? "" : "?webhook=0"}`, { maxRedirects: 0 });
  expect(res.status()).toBe(303);
  return new URL(res.headers().location).searchParams.get("pay")!;
}

/** Posts a webhook signed the Standard Webhooks way, as PaySandbox does. */
function sendWebhook(
  request: APIRequestContext,
  event: { id: string },
  { secret = E2E_WEBHOOK_SECRET, at = new Date() } = {},
) {
  const body = JSON.stringify(event);
  return request.post(WEBHOOK_PATH, {
    data: body,
    headers: {
      "content-type": "application/json",
      "webhook-id": event.id,
      "webhook-timestamp": String(Math.floor(at.getTime() / 1000)),
      "webhook-signature": new Webhook(secret).sign(event.id, at, body),
    },
  });
}

function succeededEvent(id: string, paymentId: string, session: string, amount: number) {
  return {
    id,
    object: "event",
    type: "payment.succeeded",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: {
      object: {
        id: paymentId,
        status: "succeeded",
        amount,
        checkout_session: session,
        failure_code: null,
        decline_code: null,
      },
    },
  };
}

test.describe.serial("website payments", () => {
  let main: Awaited<ReturnType<typeof leadWithSelection>>;
  let checkoutUrl = "";
  let paymentId = "";
  let paidView: unknown;

  test("payment summary lists the saved plan and add-ons", async ({ request }) => {
    main = await leadWithSelection(request);
    const res = await websiteCall(request, "GET", paymentPath(main.publicId));
    expect(res.status()).toBe(200);
    const { payment } = await res.json();
    const included = main.plan.addOns.find((a) => a.kind === "included")!;

    expect(payment).toEqual({
      status: "ready",
      lines: [
        { label: main.plan.name, amount: main.plan.basePremium },
        { label: included.name, amount: 0 },
        { label: main.optional.name, amount: main.optional.price },
      ],
      total: main.selection.total,
      quoteReference: main.selection.quoteReference,
    });
  });

  test("no selection → 409 no_selection", async ({ request }) => {
    const created = await (await websiteCall(request, "POST", OPPORTUNITIES_PATH, fullForm())).json();
    const publicId = created.opportunity.publicId;
    for (const res of [
      await websiteCall(request, "GET", paymentPath(publicId)),
      await startPayment(request, publicId),
    ]) {
      expect(res.status()).toBe(409);
      expect(await res.json()).toEqual({ error: { code: "no_selection" } });
    }
  });

  test("start payment returns the fake checkout URL", async ({ request }) => {
    checkoutUrl = await checkoutUrlOf(request, main.publicId);
    expect(checkoutUrl).toMatch(CHECKOUT_URL);

    // PaySandbox got cents, the lines and the website's return URLs
    const session = await (
      await request.get(`${FAKE}/api/v1/checkout_sessions/${sessionId(checkoutUrl)}`, {
        headers: { authorization: `Bearer ${E2E_PAYSANDBOX_KEY}` },
      })
    ).json();
    expect(session.amount).toBe(main.selection.total * 100);
    expect(session.line_items).toHaveLength(3);
    expect(session.line_items[0]).toEqual({
      name: main.plan.name,
      quantity: 1,
      amount: main.plan.basePremium * 100,
    });
    expect(session.success_url).toBe("http://localhost:3100/car/thank-you");
    expect(session.cancel_url).toBe("http://localhost:3100/car/payment");

    const { order } = await getOrder(request, main.publicId);
    expect(order).toMatchObject({ status: "pending", total: main.selection.total, paymentId: null, paidAt: null });
  });

  test("starting twice reuses the open session", async ({ request }) => {
    expect(await checkoutUrlOf(request, main.publicId)).toBe(checkoutUrl);
  });

  test("new selection after a session expires the old order", async ({ request }) => {
    const other = await leadWithSelection(request);
    const oldUrl = await checkoutUrlOf(request, other.publicId);

    // Untick the add-on: a new total, so a new session; the old order is expired
    const cheaper: Selection = (await (await select(request, other.publicId, other.plan.id, [])).json()).selection;
    const newUrl = await checkoutUrlOf(request, other.publicId);
    expect(newUrl).not.toBe(oldUrl);
    expect((await getOrder(request, other.publicId)).order).toMatchObject({ status: "pending", total: cheaper.total });

    // A payment that still arrives on the old session is recorded on its own order, but the newer selection stays open
    await pay(request, oldUrl);
    expect((await getOrder(request, other.publicId)).order).toMatchObject({
      status: "paid",
      total: other.selection.total,
    });
    const view = await (await websiteCall(request, "GET", `${OPPORTUNITIES_PATH}/${other.publicId}`)).json();
    expect(view.selection).toMatchObject({ quoteReference: cheaper.quoteReference, total: cheaper.total });
  });

  test("paying marks the order paid, accepts the quote and assigns an advisor", async ({ request }) => {
    paymentId = await pay(request, checkoutUrl);
    expect(paymentId).toMatch(/^pay_[0-9A-Za-z]{24}$/);

    paidView = await getOrder(request, main.publicId);
    const { order, advisor } = paidView as { order: Record<string, unknown>; advisor: Record<string, unknown> };
    expect(order).toMatchObject({
      status: "paid",
      paymentId,
      total: main.selection.total,
      quoteReference: main.selection.quoteReference,
      phoneMasked: "+92 *** ***4567",
    });
    expect(order.paidAt).not.toBeNull();
    expect(order.emailMasked).toMatch(/^w\*\*\*[a-z]@example\.com$/);
    expect(advisor).toMatchObject({ role: "advisor", name: expect.stringMatching(/^(Aisha Khan|Bilal Ahmed)$/) });

    // The accepted quote is no longer an open selection, and the summary says it is paid
    const view = await (await websiteCall(request, "GET", `${OPPORTUNITIES_PATH}/${main.publicId}`)).json();
    expect(view.selection).toBeNull();
    const { payment } = await (await websiteCall(request, "GET", paymentPath(main.publicId))).json();
    expect(payment).toMatchObject({ status: "already_paid", total: main.selection.total });
  });

  test("same webhook twice changes nothing", async ({ request }) => {
    const event = succeededEvent(
      "evt_e2eduplicate00000000000001",
      paymentId,
      sessionId(checkoutUrl),
      main.selection.total * 100,
    );
    const first = await sendWebhook(request, event);
    expect(first.status()).toBe(200);
    expect(await first.json()).toEqual({ received: true });
    const second = await sendWebhook(request, event);
    expect(second.status()).toBe(200);
    expect(await second.json()).toEqual({ received: true, duplicate: true });

    expect(await getOrder(request, main.publicId)).toEqual(paidView);
  });

  test("forged webhook → 401", async ({ request }) => {
    const event = succeededEvent(
      "evt_e2eforged0000000000000001",
      "pay_forged000000000000000001",
      sessionId(checkoutUrl),
      100,
    );
    const otherSecret = `whsec_${Buffer.alloc(24, 9).toString("base64")}`;
    expect((await sendWebhook(request, event, { secret: otherSecret })).status()).toBe(401);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000);
    expect((await sendWebhook(request, event, { at: tenMinutesAgo })).status()).toBe(401);
    const unsigned = await request.post(WEBHOOK_PATH, { data: JSON.stringify(event) });
    expect(unsigned.status()).toBe(401);

    expect(await getOrder(request, main.publicId)).toEqual(paidView);
  });

  test("late webhook: order read re-checks the session and marks it paid", async ({ request }) => {
    const late = await leadWithSelection(request);
    const url = await checkoutUrlOf(request, late.publicId);
    const latePayment = await pay(request, url, { webhook: false });

    // The visitor is back before PaySandbox's webhook: reading the order asks PaySandbox and records the payment
    const { order, advisor } = await getOrder(request, late.publicId);
    expect(order).toMatchObject({ status: "paid", paymentId: latePayment, total: late.selection.total });
    expect(advisor).toMatchObject({ role: "advisor" });
  });

  test("paid → start again gives 409 already_paid", async ({ request }) => {
    const res = await startPayment(request, main.publicId);
    expect(res.status()).toBe(409);
    expect(await res.json()).toEqual({ error: { code: "already_paid" } });
  });

  test("booking a paid online order makes the policy active with method Online", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto(`/leads?q=${main.reference}`);
    await expect(page.getByRole("row").filter({ hasText: main.name }).getByText("Paid online")).toBeVisible();
    await page.getByRole("link", { name: main.name }).click();
    // The first visit compiles the lead page in dev mode, so allow time for it
    await expect(page).toHaveURL(/\/leads\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    const leadUrl = new URL(page.url()).pathname;
    // One advisor assignment, however many times the payment was reported
    await expect(page.getByText("assigned the advisor", { exact: true })).toHaveCount(1);
    // Paid but not booked: the rail's Paid step is done from the order, and the banner names the next step
    const amount = `$${main.selection.total.toLocaleString("en-US")}`;
    await expect(page.getByText(`Paid online · ${amount}`)).toBeVisible();
    await expect(page.getByText(new RegExp(`^Customer paid \\${amount} online on `))).toBeVisible();
    await expect(page.getByText("Next: approve KYC.")).toBeVisible();
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(1);
    await expect(page.locator('a[href^="tel:+"]')).toHaveCount(1);

    await page.goto(`${leadUrl}?tab=kyc`);
    await page.getByLabel("ID or passport number").fill("ID-778899");
    await pick(page, "Nationality", "Pakistan");
    await pickDate(page, "Date of birth", "1990-04-12");
    await pickDate(page, "ID expiry", "2030-01-31");
    await pick(page, "Occupation", "Salaried employee");
    await pick(page, "Source of funds", "Salary");
    await page.getByRole("button", { name: "Screen and send to compliance" }).click();
    await expect(page.getByText("Waiting for a compliance officer to review.")).toBeVisible();

    await page.goto(`${leadUrl}?tab=documents`);
    const types = page.getByRole("combobox", { name: "Document type" });
    await types.click();
    const required = await page.getByRole("option", { name: /required/ }).count();
    await types.press("Escape");
    for (let i = 0; i < required; i++) {
      await types.click();
      await page
        .getByRole("option", { name: /required/ })
        .nth(i)
        .click();
      await page.getByLabel("Drag a file here or click to choose").setInputFiles(SAMPLE_PNG);
      await expect(page.getByText(SAMPLE_PNG.name).first()).toBeVisible();
      await page.getByRole("button", { name: "Upload" }).click();
      await expect(page.locator(`a[href^="${leadUrl}/documents/"]`)).toHaveCount(i + 1);
    }

    // Four-eyes rule: whoever sent the KYC can't approve it, so a compliance officer reviews it
    await loginAs(page, "compliance");
    await page.goto("/kyc");
    const card = page.locator('[data-ui="Panel"]', { has: page.getByRole("link", { name: main.name }) });
    await card.getByLabel("Note").fill("Paid online, ID verified");
    await card.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByRole("link", { name: main.name })).toHaveCount(0);

    await loginAs(page, "admin");
    await page.goto(`${leadUrl}?tab=policy`);
    await expect(page.getByText("Online payment", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Book policy" }).click();
    await expect(page.getByText(/^PD-\d{4}-\d{5}$/).first()).toBeVisible();
    await expect(page.getByText("Payment Paid")).toBeVisible();
    await expect(page.getByText("Active").first()).toBeVisible();
    await expect(page.getByText("Online (PaySandbox)", { exact: true })).toBeVisible();
    await expect(page.getByText(paymentId).first()).toBeVisible();
  });
});
