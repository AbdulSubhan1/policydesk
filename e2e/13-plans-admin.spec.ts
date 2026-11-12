import { expect, test } from "@playwright/test";
import { loginAs, pick } from "./helpers";
import { OPPORTUNITIES_PATH, customerName, fullForm, websiteCall } from "./website-client";

// Insurers and plans: real plan counts, read-only rows and the edit panel. Saved quotes keep their own snapshot.

type AddOn = { id: number; name: string; kind: "included" | "optional" | "preselected"; price: number };
type Plan = { id: number; name: string; cover: string; addOns: AddOn[] };

const plansOf = async (request: Parameters<typeof websiteCall>[0], publicId: string): Promise<Plan[]> =>
  (await (await websiteCall(request, "GET", `${OPPORTUNITIES_PATH}/${publicId}/plans`)).json()).plans;

test("insurer cards count every plan per product", async ({ page }) => {
  await loginAs(page, "admin");
  await page.goto("/admin/plans");
  const insurers = page.getByRole("list", { name: "Insurers" });
  // Every insurer that sells car insurance has three car plans; the old count said "1 plan" for all of them
  await expect(insurers.getByText(/^3 Car plans/).first()).toBeVisible();
  await expect(insurers.getByText(/^1 plan$/)).toHaveCount(0);
  const filters = page.getByRole("group", { name: "Plan filters" });
  await expect(filters.getByRole("combobox", { name: "Product" })).toHaveValue(/^Car · \d+ plans$/);
  // Rows are read-only: one Edit link each, no inputs
  await expect(page.getByRole("table").first().getByRole("spinbutton")).toHaveCount(0);
});

test("editing a plan changes what new quotes get and keeps saved quotes", async ({ page, request }) => {
  const created = await (await websiteCall(request, "POST", OPPORTUNITIES_PATH, fullForm(customerName()))).json();
  const publicId = created.opportunity.publicId;
  const plan = (await plansOf(request, publicId)).find(
    (p) => p.cover === "comprehensive" && p.addOns.filter((a) => a.kind === "optional").length > 1,
  )!;
  const optional = plan.addOns.find((a) => a.kind === "optional")!;
  const saved = await websiteCall(request, "PUT", `${OPPORTUNITIES_PATH}/${publicId}/selection`, {
    planId: plan.id,
    addOnIds: [optional.id],
  });
  const before = (await saved.json()).selection;

  await loginAs(page, "admin");
  await page.goto("/admin/plans?product=car");
  const row = page.getByRole("row").filter({ hasText: plan.name });
  const price = (await row.getByRole("cell").nth(3).textContent())!;
  await row.getByRole("link", { name: `Edit ${plan.name}` }).click();
  const panel = page.locator("#edit-plan");
  await expect(panel.getByRole("heading", { name: `Edit ${plan.name}` })).toBeVisible();
  await expect(row.getByText("Editing")).toBeVisible();
  // The panel starts from the plan's saved values
  await expect(panel.getByLabel("Price a year", { exact: true })).toHaveValue(price.replace(/\D/g, ""));

  try {
    await panel.getByLabel("Price a year", { exact: true }).fill("4321");
    await panel.getByRole("textbox", { name: "Benefits" }).fill("Free cancellation, 14 days");
    await panel.getByRole("button", { name: "Add benefit" }).click();
    await expect(panel.getByRole("button", { name: "Remove Free cancellation, 14 days" })).toBeVisible();
    await pick(page, `How ${optional.name} is offered`, "Not offered");
    await panel.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await expect(row).toContainText("$4,321");

    // New quotes can't pick the retired add-on; the quote saved before keeps it and its price
    const after = (await plansOf(request, publicId)).find((p) => p.id === plan.id)!;
    expect(after.addOns.map((a) => a.id)).not.toContain(optional.id);
    const view = await (await websiteCall(request, "GET", `${OPPORTUNITIES_PATH}/${publicId}`)).json();
    expect(view.selection.lines).toEqual(before.lines);
    expect(view.selection.total).toBe(before.total);
  } finally {
    // Put the plan back for the specs that run after this one
    await panel.getByLabel("Price a year", { exact: true }).fill(price.replace(/\D/g, ""));
    await panel.getByRole("button", { name: "Remove Free cancellation, 14 days" }).click();
    await pick(page, `How ${optional.name} is offered`, "Optional");
    await panel.getByRole("button", { name: "Save changes" }).click();
    await expect(row).toContainText(price);
  }
});

test("only admins manage plans", async ({ page }) => {
  await loginAs(page, "advisor");
  await page.goto("/admin/plans");
  await expect(page.getByText("You don't have access to this page")).toBeVisible();
});
