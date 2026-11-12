import { expect, test, type APIRequestContext } from "@playwright/test";
import { HEALTH_ADD_ONS, TRAVEL_ADD_ONS } from "../constants/add-ons";
import { PRODUCT_COVERS } from "../constants/products";
import { loginAs, pick } from "./helpers";
import {
  E2E_PAYSANDBOX_KEY,
  E2E_WEBSITE_URL,
  FAKE_PAYSANDBOX_PORT,
  OPPORTUNITIES_PATH,
  customerName,
  fullForm,
  isoInDays,
  productForm,
  websiteCall,
  type NewProduct,
} from "./website-client";

// Travel, home and health next to car: each product's own details, its department's people, and only its own plans
// and add-ons. Payment goes through the fake PaySandbox (e2e/fake-paysandbox.mjs), as in 08-website-payments.

type AddOn = { id: number; key: string; name: string; kind: "included" | "optional" | "preselected"; price: number };
type Plan = { id: number; cover: string; basePremium: number; addOns: AddOn[] };

/** Who coordinates (and advises) each product's department in the seed. */
const PEOPLE = {
  car: { coordinators: ["Hina Malik", "Saad Raza"], code: "CAR" },
  travel: { coordinators: ["Mehwish Iqbal"], code: "TRV" },
  home: { coordinators: ["Mehwish Iqbal"], code: "HOM" },
  health: { coordinators: ["Kamran Ali"], code: "HLT" },
} as const;

async function createLead(request: APIRequestContext, body: unknown) {
  const res = await websiteCall(request, "POST", OPPORTUNITIES_PATH, body);
  expect(res.status()).toBe(201);
  return res.json();
}

async function plansOf(request: APIRequestContext, publicId: string): Promise<Plan[]> {
  const res = await websiteCall(request, "GET", `${OPPORTUNITIES_PATH}/${publicId}/plans`);
  expect(res.status()).toBe(200);
  return (await res.json()).plans;
}

/** The API's 400 for a body: its error object. */
async function refused(request: APIRequestContext, body: unknown) {
  const res = await websiteCall(request, "POST", OPPORTUNITIES_PATH, body);
  expect(res.status()).toBe(400);
  return (await res.json()).error;
}

test.describe("website products", () => {
  for (const product of ["car", "travel", "home", "health"] as const) {
    test(`${product} full form makes a lead with a ${product} coordinator`, async ({ request }) => {
      const body = product === "car" ? fullForm() : productForm(product);
      const view = await createLead(request, body);
      const { coordinators, code } = PEOPLE[product];
      expect(view.opportunity).toMatchObject({ status: "converted", product });
      expect(view.lead.reference).toMatch(new RegExp(`^${code}-[A-Z2-9]{7}$`));
      expect(view.contact).toMatchObject({ role: "coordinator", phone: expect.stringMatching(/^\+92/) });
      expect(coordinators).toContain(view.contact.name);
    });
  }

  test("quick forms send only the one question", async ({ request }) => {
    for (const product of ["travel", "home", "health"] as NewProduct[]) {
      const view = await createLead(request, productForm(product, "short"));
      expect(view.opportunity).toMatchObject({ status: "new", product });
      expect(view.lead).toBeNull();
      expect(PEOPLE[product].coordinators).toContain(view.contact.name);
    }
  });

  test("bike is refused", async ({ page, request }) => {
    const name = customerName();
    for (const product of ["bike", "life"]) {
      expect(await refused(request, { ...productForm("travel", "full", name), product })).toEqual({
        code: "invalid_request",
        field: "product",
        message: "validation.invalidOption",
      });
    }

    // Nothing was written
    await loginAs(page, "admin");
    await page.goto(`/opportunities?q=${encodeURIComponent(name)}`);
    await expect(page.getByRole("heading", { name: "Opportunities" })).toBeVisible();
    await expect(page.getByRole("link", { name })).toHaveCount(0);
  });

  test("a field of another product or a missing one is refused with its name", async ({ request }) => {
    const travel = productForm("travel");
    expect(await refused(request, { ...travel, details: { ...travel.details, make: "Toyota" } })).toMatchObject({
      field: "details.make",
    });
    const noTravellers = Object.fromEntries(Object.entries(travel.details).filter(([key]) => key !== "travellers"));
    expect(await refused(request, { ...travel, details: noTravellers })).toMatchObject({
      field: "details.travellers",
      message: "validation.required",
    });
  });

  test("travel dates are checked", async ({ request }) => {
    const travel = productForm("travel");
    const withDates = (dates: Record<string, string | undefined>, tripType = "single") => ({
      ...travel,
      details: { ...travel.details, tripType, ...dates },
    });
    const cases: [Record<string, string | undefined>, string, string, string?][] = [
      [{ startDate: isoInDays(10), endDate: isoInDays(9) }, "details.endDate", "validation.endBeforeStart"],
      [{ startDate: isoInDays(-1), endDate: isoInDays(5) }, "details.startDate", "validation.startInPast"],
      [{ startDate: isoInDays(1), endDate: isoInDays(182) }, "details.endDate", "validation.tripTooLong"],
      [{ startDate: isoInDays(1), endDate: isoInDays(30) }, "details.endDate", "validation.annualNoEndDate", "annual"],
    ];
    for (const [dates, field, message, tripType] of cases) {
      expect(await refused(request, withDates(dates, tripType))).toEqual({ code: "invalid_request", field, message });
    }
    // An annual trip needs no end date
    await createLead(request, withDates({ startDate: isoInDays(1), endDate: undefined }, "annual"));
  });

  test("plans for travel are travel plans with travel add-ons", async ({ request }) => {
    const view = await createLead(request, productForm("travel"));
    const plans = await plansOf(request, view.opportunity.publicId);
    expect(plans.length).toBeGreaterThan(1);
    const travelKeys = TRAVEL_ADD_ONS.map((a) => a.key) as string[];
    for (const plan of plans) {
      expect(PRODUCT_COVERS.travel).toContain(plan.cover);
      expect(plan.addOns.length).toBeGreaterThan(0);
      for (const addOn of plan.addOns) expect(travelKeys).toContain(addOn.key);
      const cancellation = plan.addOns.find((a) => a.key === "trip_cancellation")!;
      expect(cancellation.kind).toBe(plan.cover === "annual_multi_trip" ? "included" : "optional");
      expect(plan.addOns.find((a) => a.key === "baggage_delay")!.kind).toBe("preselected");
    }

    // A plan of another product can't be picked for this lead
    const car = await createLead(request, fullForm());
    const [carPlan] = await plansOf(request, car.opportunity.publicId);
    const res = await websiteCall(request, "PUT", `${OPPORTUNITIES_PATH}/${view.opportunity.publicId}/selection`, {
      planId: carPlan.id,
      addOnIds: [],
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatchObject({ field: "planId" });
  });

  test("health plans include the wellness check-up", async ({ request }) => {
    const view = await createLead(request, productForm("health"));
    const healthKeys = HEALTH_ADD_ONS.map((a) => a.key) as string[];
    for (const plan of await plansOf(request, view.opportunity.publicId)) {
      expect(PRODUCT_COVERS.health).toContain(plan.cover);
      for (const addOn of plan.addOns) expect(healthKeys).toContain(addOn.key);
      expect(plan.addOns.find((a) => a.key === "wellness_checkup")).toMatchObject({ kind: "included", price: 0 });
    }
  });

  test("health payment assigns a health advisor", async ({ request }) => {
    const view = await createLead(request, productForm("health"));
    const publicId: string = view.opportunity.publicId;
    const [plan] = await plansOf(request, publicId);
    const optional = plan.addOns.find((a) => a.kind === "optional")!;
    const selected = await websiteCall(request, "PUT", `${OPPORTUNITIES_PATH}/${publicId}/selection`, {
      planId: plan.id,
      addOnIds: [optional.id],
    });
    expect(selected.status()).toBe(200);

    const started = await websiteCall(request, "POST", `${OPPORTUNITIES_PATH}/${publicId}/payment`, {});
    expect(started.status()).toBe(200);
    const { checkoutUrl } = await started.json();
    // PaySandbox sends the visitor back to the health pages, not the car ones
    const sessionId = new URL(checkoutUrl).pathname.split("/").pop();
    const session = await (
      await request.get(`http://localhost:${FAKE_PAYSANDBOX_PORT}/api/v1/checkout_sessions/${sessionId}`, {
        headers: { authorization: `Bearer ${E2E_PAYSANDBOX_KEY}` },
      })
    ).json();
    expect(session).toMatchObject({
      success_url: `${E2E_WEBSITE_URL}/health/thank-you`,
      cancel_url: `${E2E_WEBSITE_URL}/health/payment`,
    });
    // Pressing Pay on the fake checkout posts the signed webhook to PolicyDesk before redirecting
    const paid = await request.post(`${checkoutUrl}/pay`, { maxRedirects: 0 });
    expect(paid.status()).toBe(303);

    const order = await (await websiteCall(request, "GET", `${OPPORTUNITIES_PATH}/${publicId}/order`)).json();
    expect(order.order).toMatchObject({ status: "paid", total: plan.basePremium + optional.price });
    expect(order.advisor).toMatchObject({ role: "advisor", name: "Zain Raza", phone: expect.stringMatching(/^\+92/) });
  });

  test("coordinator completes a home quick form and converts it", async ({ page, request }) => {
    const name = customerName();
    const created = await createLead(request, productForm("home", "short", name));

    await loginAs(page, "admin");
    await page.goto(`/opportunities?q=${encodeURIComponent(name)}`);
    await page.getByRole("link", { name }).click();
    // The first visit compiles the opportunity page in dev mode, so allow time for it
    await expect(page.getByRole("heading", { name })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Home details")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "City" })).toHaveValue("Karachi");

    await pick(page, "Status", "Qualified");
    await page.getByRole("button", { name: "Set status" }).click();
    await expect(page.getByText("The advisor is assigned automatically after the customer pays.")).toBeVisible();
    // The quick form sent the city; the property type is the first field still missing
    await page.getByRole("button", { name: "Convert" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Complete the property type before converting" }),
    ).toBeVisible();

    await pick(page, "Property type", "Villa");
    await pick(page, "Owner or tenant", "Tenant");
    // A tenant insures no building
    await page.getByRole("spinbutton", { name: "Building value" }).fill("300000");
    await page.getByRole("spinbutton", { name: "Contents value" }).fill("40000");
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Only owners insure the building; leave it empty for a tenant")).toBeVisible();
    await page.getByRole("spinbutton", { name: "Building value" }).fill("");
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Details saved")).toBeVisible();

    await page.getByRole("button", { name: "Convert" }).click();
    await expect(
      page.getByText("This opportunity is now a lead. The advisor is assigned after the customer pays."),
    ).toBeVisible();
    const view = await (
      await websiteCall(request, "GET", `${OPPORTUNITIES_PATH}/${created.opportunity.publicId}`)
    ).json();
    expect(view.lead.reference).toMatch(/^HOM-[A-Z2-9]{7}$/);
  });
});
