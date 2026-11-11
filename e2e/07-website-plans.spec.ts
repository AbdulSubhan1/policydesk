import { expect, test, type APIRequestContext } from "@playwright/test";
import { loginAs } from "./helpers";
import { OPPORTUNITIES_PATH, customerName, fullForm, shortForm, websiteCall } from "./website-client";

// Plans and selection for the Brokwise website. The website sends ids only; PolicyDesk prices everything.

type AddOn = { id: number; key: string; name: string; kind: "included" | "optional" | "preselected"; price: number };
type Plan = { id: number; insurer: string; name: string; cover: string; basePremium: number; addOns: AddOn[] };

const plansPath = (publicId: string) => `${OPPORTUNITIES_PATH}/${publicId}/plans`;
const selectionPath = (publicId: string) => `${OPPORTUNITIES_PATH}/${publicId}/selection`;

function select(request: APIRequestContext, publicId: string, planId: number, addOnIds: number[]) {
  return websiteCall(request, "PUT", selectionPath(publicId), { planId, addOnIds });
}

const kind = (plan: Plan, k: AddOn["kind"]) => plan.addOns.find((a) => a.kind === k)!;

test.describe.serial("website plans and selection", () => {
  let publicId = "";
  let name = "";
  let plans: Plan[] = [];
  // A comprehensive plan has all three kinds: included, preselected and optional
  let comprehensive: Plan;
  let quoteReference = "";
  let lastSelection: unknown;

  test("full-form lead gets car plans with add-ons, cheapest first", async ({ request }) => {
    name = customerName();
    const created = await (await websiteCall(request, "POST", OPPORTUNITIES_PATH, fullForm(name))).json();
    publicId = created.opportunity.publicId;

    const res = await websiteCall(request, "GET", plansPath(publicId));
    expect(res.status()).toBe(200);
    plans = (await res.json()).plans;
    expect(plans.length).toBeGreaterThan(1);
    const premiums = plans.map((p) => p.basePremium);
    expect(premiums).toEqual([...premiums].sort((a, b) => a - b));
    for (const plan of plans) {
      expect(["third_party", "comprehensive", "comprehensive_agency"]).toContain(plan.cover);
      expect(plan.addOns.length).toBeGreaterThan(0);
    }
    comprehensive = plans.find((p) => p.cover === "comprehensive")!;
    expect(comprehensive.addOns.map((a) => a.kind)).toEqual(
      expect.arrayContaining(["included", "preselected", "optional"]),
    );
    expect(kind(comprehensive, "included").price).toBe(0);
  });

  test("short-form opportunity → 409 no_lead", async ({ request }) => {
    const short = await (await websiteCall(request, "POST", OPPORTUNITIES_PATH, shortForm())).json();
    const res = await websiteCall(request, "GET", plansPath(short.opportunity.publicId));
    expect(res.status()).toBe(409);
    expect(await res.json()).toEqual({ error: { code: "no_lead" } });

    const put = await select(request, short.opportunity.publicId, comprehensive.id, []);
    expect(put.status()).toBe(409);
  });

  test("selection with an optional add-on saves a quote with the right total", async ({ request }) => {
    const optional = kind(comprehensive, "optional");
    const res = await select(request, publicId, comprehensive.id, [optional.id]);
    expect(res.status()).toBe(200);
    const { selection } = await res.json();
    expect(selection.quoteReference).toMatch(/^CAR-[A-Z2-9]{7}-Q1$/);
    expect(selection.total).toBe(comprehensive.basePremium + optional.price);
    expect(selection.addOnIds).toEqual([optional.id]);
    expect(selection.lines[0]).toEqual({ label: comprehensive.name, kind: "plan", amount: comprehensive.basePremium });
    expect(selection.lines).toContainEqual({
      label: kind(comprehensive, "included").name,
      kind: "included",
      amount: 0,
    });
    quoteReference = selection.quoteReference;
  });

  test("selecting again updates the same quote reference", async ({ request }) => {
    const cheapest = plans[0];
    const { selection } = await (await select(request, publicId, cheapest.id, [])).json();
    expect(selection.quoteReference).toBe(quoteReference);
    expect(selection.planId).toBe(cheapest.id);
    expect(selection.total).toBe(cheapest.basePremium);
  });

  test("unticked preselected add-on lowers the total", async ({ request }) => {
    const optional = kind(comprehensive, "optional");
    const preselected = kind(comprehensive, "preselected");
    const ticked = (await (await select(request, publicId, comprehensive.id, [preselected.id, optional.id])).json())
      .selection;
    const unticked = (await (await select(request, publicId, comprehensive.id, [optional.id])).json()).selection;
    expect(ticked.total).toBe(comprehensive.basePremium + preselected.price + optional.price);
    expect(unticked.total).toBe(ticked.total - preselected.price);
    expect(unticked.quoteReference).toBe(quoteReference);
    lastSelection = unticked;
  });

  test("included add-on id → 400 addOnIds", async ({ request }) => {
    const res = await select(request, publicId, comprehensive.id, [kind(comprehensive, "included").id]);
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatchObject({ code: "invalid_request", field: "addOnIds" });
  });

  test("add-on of another plan → 400 addOnIds", async ({ request }) => {
    const other = plans.find((p) => p.id !== comprehensive.id)!;
    const res = await select(request, publicId, comprehensive.id, [other.addOns[0].id]);
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatchObject({ code: "invalid_request", field: "addOnIds" });
  });

  test("non-car plan → 400 planId", async ({ request }) => {
    // The seed adds car plans first and bike plans right after them, so the next id is a bike plan
    const bikePlanId = Math.max(...plans.map((p) => p.id)) + 1;
    for (const planId of [bikePlanId, 999_999]) {
      const res = await select(request, publicId, planId, []);
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toMatchObject({ code: "invalid_request", field: "planId" });
    }
  });

  test("inactive plan → 400 planId", async ({ page, request }) => {
    const plan = plans[0];
    await loginAs(page, "admin");
    await page.goto("/admin/plans?product=car");
    const row = page.getByRole("row").filter({ hasText: plan.name });
    await row.getByRole("button", { name: "Deactivate" }).click();
    await expect(row.getByRole("button", { name: "Activate" })).toBeVisible();
    try {
      const res = await select(request, publicId, plan.id, []);
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toMatchObject({ field: "planId" });
    } finally {
      await row.getByRole("button", { name: "Activate" }).click();
      await expect(row.getByRole("button", { name: "Deactivate" })).toBeVisible();
    }
  });

  test("GET opportunity returns the selection", async ({ request }) => {
    // The refused calls above saved nothing: the last good selection is still there
    const view = await (await websiteCall(request, "GET", `${OPPORTUNITIES_PATH}/${publicId}`)).json();
    expect(view.selection).toEqual(lastSelection);
  });

  test("lead page shows the quote with its add-ons", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto(`/opportunities?q=${encodeURIComponent(name)}`);
    await page.getByRole("link", { name }).click();
    await page.getByRole("link", { name: "Open lead" }).click();
    // The first visit compiles the lead page in dev mode, so allow time for it
    await expect(page).toHaveURL(/\/leads\//, { timeout: 30_000 });

    const row = page.getByRole("row").filter({ hasText: quoteReference });
    const optional = kind(comprehensive, "optional");
    await expect(row).toContainText(kind(comprehensive, "included").name);
    await expect(row).toContainText("Included");
    await expect(row).toContainText(`${optional.name} · $${optional.price}`);
    await expect(row).not.toContainText(kind(comprehensive, "preselected").name);
    await expect(row).toContainText("Website");
  });
});
