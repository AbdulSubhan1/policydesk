import { expect, test, type Page } from "@playwright/test";
import { loginAs } from "./helpers";
import { OPPORTUNITIES_PATH, customerName, fullForm, shortForm, websiteCall } from "./website-client";

// The signed API the Brokwise website calls. Requests are signed like the website signs them (e2e/website-client.ts).

const COORDINATORS = ["Hina Coordinator", "Saad Coordinator"];

/** Flips a user's Available toggle on the admin Users page and waits for the new state. */
async function setAvailable(page: Page, name: string, available: boolean) {
  const row = page.getByRole("row").filter({ hasText: name });
  const target = available ? "Set available" : "Set unavailable";
  const after = available ? "Set unavailable" : "Set available";
  if (await row.getByRole("button", { name: after }).isVisible()) return;
  await row.getByRole("button", { name: target }).click();
  await expect(row.getByRole("button", { name: after })).toBeVisible();
}

test.describe.serial("website API", () => {
  let shortId = "";
  let fullCustomer = "";

  test("short form creates an opportunity with a coordinator", async ({ request }) => {
    const res = await websiteCall(request, "POST", OPPORTUNITIES_PATH, shortForm());
    expect(res.status()).toBe(201);
    const view = await res.json();
    expect(view.opportunity).toMatchObject({ status: "new", product: "car" });
    expect(view.lead).toBeNull();
    expect(view.contact.role).toBe("coordinator");
    expect(view.contact.phone).toMatch(/^\+92/);
    shortId = view.opportunity.publicId;
  });

  test("full form creates the opportunity and a CAR- lead", async ({ request }) => {
    fullCustomer = customerName();
    const res = await websiteCall(request, "POST", OPPORTUNITIES_PATH, fullForm(fullCustomer));
    expect(res.status()).toBe(201);
    const view = await res.json();
    expect(view.lead.reference).toMatch(/^CAR-[A-Z2-9]{7}$/);
    expect(view.opportunity.status).toBe("converted");
    expect(view.contact.role).toBe("coordinator");
  });

  test("GET returns the same view", async ({ request }) => {
    const created = await (await websiteCall(request, "POST", OPPORTUNITIES_PATH, fullForm())).json();
    const res = await websiteCall(request, "GET", `${OPPORTUNITIES_PATH}/${created.opportunity.publicId}`);
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual(created);

    const short = await websiteCall(request, "GET", `${OPPORTUNITIES_PATH}/${shortId}`);
    expect((await short.json()).lead).toBeNull();
  });

  test("GET unknown id → 404", async ({ request }) => {
    const res = await websiteCall(request, "GET", `${OPPORTUNITIES_PATH}/${crypto.randomUUID()}`);
    expect(res.status()).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "not_found" } });
  });

  test('GET "not-a-uuid" → 404', async ({ request }) => {
    const res = await websiteCall(request, "GET", `${OPPORTUNITIES_PATH}/not-a-uuid`);
    expect(res.status()).toBe(404);
  });

  test("unsigned → 401", async ({ request }) => {
    const res = await request.post(OPPORTUNITIES_PATH, { data: shortForm() });
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: { code: "unauthorized" } });
  });

  test("extra key coordinatorId → 400 invalid_request", async ({ request }) => {
    const res = await websiteCall(request, "POST", OPPORTUNITIES_PATH, { ...shortForm(), coordinatorId: 1 });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatchObject({ code: "invalid_request", field: "coordinatorId" });
  });

  test('full form without city → 400 with field "details.city"', async ({ request }) => {
    const body = fullForm();
    delete (body.details as Partial<typeof body.details>).city;
    const res = await websiteCall(request, "POST", OPPORTUNITIES_PATH, body);
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatchObject({ code: "invalid_request", field: "details.city" });
  });

  test("nobody available → contact null", async ({ page, request }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/users");
    try {
      for (const name of COORDINATORS) await setAvailable(page, name, false);
      const res = await websiteCall(request, "POST", OPPORTUNITIES_PATH, shortForm());
      expect(res.status()).toBe(201);
      expect((await res.json()).contact).toBeNull();
    } finally {
      for (const name of COORDINATORS) await setAvailable(page, name, true);
    }
  });

  test('opportunity page shows car details and "Website" in the timeline', async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto(`/opportunities?q=${encodeURIComponent(fullCustomer)}`);
    await page.getByRole("link", { name: fullCustomer }).click();

    await expect(page.getByRole("heading", { name: fullCustomer })).toBeVisible();
    await expect(page.getByText("Car details")).toBeVisible();
    await expect(page.getByText("Corolla")).toBeVisible();
    await expect(page.getByText("Karachi")).toBeVisible();

    await page.getByRole("link", { name: "Open lead" }).click();
    // The first visit compiles the lead page in dev mode, so allow time for it
    await expect(page).toHaveURL(/\/leads\//, { timeout: 30_000 });
    await expect(page.getByText(/^Website converted the opportunity into this lead$/)).toBeVisible();
  });
});
