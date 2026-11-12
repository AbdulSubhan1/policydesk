import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { loginAs, pick, pickDate } from "./helpers";
import { E2E_WEBSITE_URL, OPPORTUNITIES_PATH, customerName, shortForm, websiteCall } from "./website-client";

// The assisted flow: a short-form visitor's coordinator completes the details, converts without an advisor, picks
// the plan with the customer and sends a payment link. The website opens the link to start the payment journey.

type AddOn = { id: number; name: string; kind: "included" | "optional" | "preselected"; price: number };
type Plan = { id: number; insurer: string; name: string; cover: string; basePremium: number; addOns: AddOn[] };

const PAY_LINK = new RegExp(`^${E2E_WEBSITE_URL}/pay/([A-Za-z0-9_-]{43})$`);
const openPath = (token: string) => `/api/website/v1/pay-links/${token}/open`;
const openLink = (request: APIRequestContext, token: string) => websiteCall(request, "POST", openPath(token));

/** A plan's total when the coordinator picks it: preselected add-ons come ticked. */
const pickedTotal = (plan: Plan, extra: AddOn[] = []) =>
  plan.basePremium +
  [...plan.addOns.filter((a) => a.kind === "preselected"), ...extra].reduce((sum, a) => sum + a.price, 0);

/** The link the page shows once after "Create payment link", and its token. */
async function createLink(page: Page, button: string) {
  await page.getByRole("button", { name: button }).click();
  const url = await page.getByRole("textbox", { name: "Payment link" }).inputValue();
  expect(url).toMatch(PAY_LINK);
  return PAY_LINK.exec(url)![1];
}

async function paymentTotal(request: APIRequestContext, publicId: string) {
  const res = await websiteCall(request, "GET", `${OPPORTUNITIES_PATH}/${publicId}/payment`);
  expect(res.status()).toBe(200);
  return (await res.json()).payment;
}

test.describe.serial("assisted flow and payment links", () => {
  const name = customerName();
  let publicId = "";
  let opportunityUrl = "";
  let plans: Plan[] = [];
  let token = "";

  test.beforeAll(async ({ request }) => {
    const res = await websiteCall(request, "POST", OPPORTUNITIES_PATH, shortForm(name));
    expect(res.status()).toBe(201);
    publicId = (await res.json()).opportunity.publicId;
  });

  test("convert refused while details are missing", async ({ page }) => {
    await loginAs(page, "coordinator");
    await page.goto(`/opportunities?q=${encodeURIComponent(name)}`);
    await page.getByRole("link", { name }).click();
    // The first visit compiles the opportunity page in dev mode, so allow time for it
    await expect(page.getByRole("heading", { name })).toBeVisible({ timeout: 30_000 });
    opportunityUrl = new URL(page.url()).pathname;

    await pick(page, "Status", "Qualified");
    await page.getByRole("button", { name: "Set status" }).click();
    await expect(page.getByText("The advisor is assigned automatically after the customer pays.")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Advisor" })).toHaveCount(0);

    // The short form sent make, model and year; GCC spec is the first field still missing
    await page.getByRole("button", { name: "Convert" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Complete GCC spec before converting" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save details" })).toBeVisible();
  });

  test("coordinator completes details and converts a short-form opportunity without an advisor", async ({
    page,
    request,
  }) => {
    await loginAs(page, "coordinator");
    await page.goto(opportunityUrl);
    await pick(page, "GCC spec", "Yes");
    await page.getByRole("spinbutton", { name: "Car value" }).fill("18000");
    await pickDate(page, "Date of birth", "1990-04-12");
    await page.getByRole("textbox", { name: "Nationality" }).fill("Pakistan");
    await page.getByRole("textbox", { name: "City" }).fill("Karachi");
    await page.getByRole("spinbutton", { name: "Years licensed" }).fill("8");
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Details saved")).toBeVisible();

    await page.getByRole("button", { name: "Convert" }).click();
    await expect(
      page.getByText("This opportunity is now a lead. The advisor is assigned after the customer pays."),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Online payment" })).toBeVisible();

    // The website now sees the lead; its plans are the full-form visitor's
    const view = await (await websiteCall(request, "GET", `${OPPORTUNITIES_PATH}/${publicId}`)).json();
    expect(view.opportunity.status).toBe("converted");
    expect(view.lead.reference).toMatch(/^CAR-[A-Z2-9]{7}$/);
    const res = await websiteCall(request, "GET", `${OPPORTUNITIES_PATH}/${publicId}/plans`);
    expect(res.status()).toBe(200);
    plans = (await res.json()).plans;

    // Nobody is the advisor until the customer pays
    const order = await (await websiteCall(request, "GET", `${OPPORTUNITIES_PATH}/${publicId}/order`)).json();
    expect(order).toEqual({ order: null, advisor: null });
  });

  test("coordinator chooses a plan with an add-on and creates a pay link shown once", async ({ page, request }) => {
    const plan = plans.find((p) => p.cover === "comprehensive")!;
    const optional = plan.addOns.find((a) => a.kind === "optional")!;
    await loginAs(page, "coordinator");
    await page.goto(opportunityUrl);
    await expect(page.getByText("Save a plan first to create a payment link.")).toBeVisible();

    await pick(page, "Plan", plan.name);
    await page.getByRole("checkbox", { name: new RegExp(`^${optional.name}`) }).check();
    const total = pickedTotal(plan, [optional]);
    await expect(page.getByText(`Total: $${total.toLocaleString("en-US")} a year`)).toBeVisible();
    await page.getByRole("button", { name: "Save choice" }).click();
    await expect(page.getByText("Choice saved")).toBeVisible();
    expect((await paymentTotal(request, publicId)).total).toBe(total);

    token = await createLink(page, "Create payment link");
    await expect(page.getByText("Shown once. Create a new link if it's lost.")).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "Active" })).toHaveCount(1);

    // Only the hash is kept, so the page can't show the link again
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Payment link" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Create a new link" })).toBeVisible();
  });

  test("open pay link → 200 active with the opportunity id", async ({ request }) => {
    for (let i = 0; i < 2; i++) {
      const res = await openLink(request, token);
      expect(res.status()).toBe(200);
      expect(await res.json()).toEqual({ opportunity: { publicId }, status: "active" });
    }
  });

  test("new link revokes the old one (old → 404)", async ({ page, request }) => {
    await loginAs(page, "coordinator");
    await page.goto(opportunityUrl);
    const old = token;
    token = await createLink(page, "Create a new link");
    expect(token).not.toBe(old);

    const res = await openLink(request, old);
    expect(res.status()).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "not_found" } });
    expect((await openLink(request, token)).status()).toBe(200);
    await expect(page.getByRole("row").filter({ hasText: "Revoked" })).toHaveCount(1);
    await expect(page.getByRole("row").filter({ hasText: "Active" })).toHaveCount(1);
  });

  test("unknown token → 404", async ({ request }) => {
    for (const guess of ["A".repeat(43), "not-a-token"]) {
      const res = await openLink(request, guess);
      expect(res.status()).toBe(404);
      expect(await res.json()).toEqual({ error: { code: "not_found" } });
    }
  });

  test("changing the plan after the link → payment summary shows the new total", async ({ page, request }) => {
    const cheapest = plans[0];
    await loginAs(page, "coordinator");
    await page.goto(opportunityUrl);
    await pick(page, "Plan", cheapest.name);
    await page.getByRole("button", { name: "Save choice" }).click();
    await expect(page.getByText("Choice saved")).toBeVisible();

    // The link still works and the website's payment page charges the new choice
    expect((await openLink(request, token)).status()).toBe(200);
    const payment = await paymentTotal(request, publicId);
    expect(payment).toMatchObject({ status: "ready", total: pickedTotal(cheapest) });
    expect(payment.lines[0].label).toBe(cheapest.name);
  });

  test("paid order → open gives status paid", async ({ page, request }) => {
    const start = await websiteCall(request, "POST", `${OPPORTUNITIES_PATH}/${publicId}/payment`, {});
    expect(start.status()).toBe(200);
    const { checkoutUrl } = await start.json();
    const paid = await request.post(`${checkoutUrl}/pay`, { maxRedirects: 0 });
    expect(paid.status()).toBe(303);

    const res = await openLink(request, token);
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ opportunity: { publicId }, status: "paid" });

    await loginAs(page, "coordinator");
    await page.goto(opportunityUrl);
    await expect(page.getByText("The customer has paid. The advisor takes it from here on the lead.")).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "Paid" })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Save choice" })).toHaveCount(0);
  });

  test("coordinator of another department can't see it", async ({ page }) => {
    // Kamran coordinates Health, not Motor & Marine; signs in with the form like any seeded user
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email").fill("kamran@policydesk.dev");
    await page.getByLabel("Password", { exact: true }).fill("demo1234");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL("/", { timeout: 30_000 });

    expect((await page.goto(opportunityUrl))?.status()).toBe(404);
  });
});
