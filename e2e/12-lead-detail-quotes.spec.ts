import { expect, test } from "@playwright/test";
import { loginAs, pick } from "./helpers";
import { OPPORTUNITIES_PATH, customerName, fullForm, websiteCall } from "./website-client";

// The lead page: header, KYC filled from the website, the quote cards and adding a quote with add-ons, a discount
// and the insurer's own price. One website car lead, so the plan prices are rated from its answers.

type AddOn = { id: number; name: string; kind: "included" | "optional" | "preselected"; price: number };
type Plan = { id: number; name: string; cover: string; basePremium: number; addOns: AddOn[] };

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

test.describe.serial("lead page and quotes", () => {
  let leadUrl = "";
  let name = "";
  let plan: Plan;

  test("a website lead opens with its answers in KYC", async ({ page, request }) => {
    name = customerName();
    const created = await (await websiteCall(request, "POST", OPPORTUNITIES_PATH, fullForm(name))).json();
    const plans: Plan[] = (
      await (await websiteCall(request, "GET", `${OPPORTUNITIES_PATH}/${created.opportunity.publicId}/plans`)).json()
    ).plans;
    plan = plans.find((p) => p.cover === "comprehensive" && p.addOns.some((a) => a.kind === "optional"))!;

    await loginAs(page, "admin");
    await page.goto(`/leads?q=${created.lead.reference}`);
    await page.getByRole("link", { name }).click();
    await expect(page).toHaveURL(/\/leads\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    leadUrl = new URL(page.url()).pathname;

    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
    await expect(page.getByText(created.lead.reference, { exact: true }).first()).toBeVisible();
    const tabs = page.getByRole("navigation", { name: "Quotes" });
    for (const tab of ["Quotes", "KYC", /^Documents \d\/\d$/, "Policy"]) {
      await expect(tabs.getByRole("link", { name: tab })).toBeVisible();
    }
    // One button for the stage and the advisor, and a More menu
    await expect(page.getByRole("button", { name: "Change stage or advisor" })).toBeVisible();
    await expect(page.getByRole("button", { name: "More actions" })).toBeVisible();
    await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/923001234567");

    // Nationality and date of birth came from the website form
    await page.goto(`${leadUrl}?tab=kyc`);
    await expect(page.getByText("2 answers came from the website form. Check them, then fill the rest.")).toBeVisible();
    await expect(page.getByText("From website", { exact: true })).toHaveCount(2);
    await expect(page.getByRole("combobox", { name: "Nationality" })).toHaveValue("Pakistan");
  });

  test("adding a quote fills the price from the plan, add-ons and a discount", async ({ page }) => {
    const optional = plan.addOns.find((a) => a.kind === "optional")!;
    const preselected = plan.addOns.filter((a) => a.kind === "preselected");
    await loginAs(page, "admin");
    await page.goto(`${leadUrl}?tab=quotes`);

    await pick(page, "Plan", plan.name);
    // Preselected add-ons start ticked, included ones are locked on
    for (const a of preselected)
      await expect(page.getByRole("checkbox", { name: new RegExp(`^${a.name}`) })).toBeChecked();
    const included = plan.addOns.find((a) => a.kind === "included");
    if (included) await expect(page.getByRole("checkbox", { name: new RegExp(`^${included.name}`) })).toBeDisabled();
    await page.getByRole("checkbox", { name: new RegExp(`^${optional.name}`) }).check();

    const subtotal = plan.basePremium + optional.price + preselected.reduce((sum, a) => sum + a.price, 0);
    const form = page.locator("form", { has: page.getByRole("button", { name: "Add quote" }) });
    await expect(form.getByRole("row", { name: "Total a year" })).toContainText(usd(subtotal));

    // A discount that leaves nothing to pay is refused next to the field
    const discount = form.getByLabel("Discount");
    await discount.fill(String(subtotal));
    await form.getByRole("button", { name: "Add quote" }).click();
    await expect(form.getByText("The discount must be less than the price")).toBeVisible();
    await expect(discount).toBeFocused();

    await discount.fill("50");
    await expect(form.getByRole("row", { name: "Total a year" })).toContainText(usd(subtotal - 50));
    await form.getByRole("button", { name: "Add quote" }).click();
    await expect(page.getByText("Quote added")).toBeVisible();

    const card = page.getByRole("article", { name: plan.name });
    await expect(card.getByRole("row", { name: "Plan, 1 year" })).toContainText(usd(plan.basePremium));
    await expect(card.getByRole("row", { name: optional.name })).toContainText(usd(optional.price));
    await expect(card.getByRole("row", { name: "Advisor discount" })).toContainText(`−${usd(50)}`);
    await expect(card.getByRole("row", { name: "Total a year" })).toContainText(usd(subtotal - 50));
    await expect(card.getByText(/^Made by Sara Admin · quote [A-Z]{3}-[A-Z0-9]{7}-Q1 · /)).toBeVisible();
  });

  test("the insurer's own price is kept as an override", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto(`${leadUrl}?tab=quotes`);
    await pick(page, "Plan", plan.name);
    const form = page.locator("form", { has: page.getByRole("button", { name: "Add quote" }) });
    await form.getByRole("button", { name: "The insurer gave a different price" }).click();
    await form.getByLabel("Insurer's price a year").fill("999");
    await expect(form.getByRole("row", { name: "Total a year" })).toContainText("$999");
    await form.getByRole("button", { name: "Add quote" }).click();
    await expect(page.getByText("Quote added")).toBeVisible();

    const cards = page.getByRole("article", { name: plan.name });
    await expect(cards).toHaveCount(2);
    const overridden = cards.filter({ hasText: "-Q2" });
    await expect(overridden.getByRole("row", { name: "Changed to the insurer's price" })).toBeVisible();
    await expect(overridden.getByRole("row", { name: "Total a year" })).toContainText("$999");
    await expect(page.getByRole("link", { name: /^Quotes/ })).toContainText("2");
  });

  test("stage and advisor change in one dialog, and a phone has no sideways scroll", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto(`${leadUrl}?tab=quotes`);
    await page.getByRole("button", { name: "Change stage or advisor" }).click();
    const dialog = page.getByRole("dialog", { name: "Change stage or advisor" });
    await pick(page, "Advisor", "Bilal Ahmed");
    await dialog.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText(/· advisor Bilal Ahmed ·/)).toBeVisible();

    await page.goto(`${leadUrl}?tab=quotes&activity=all`);
    await expect(page.getByText("reassigned the lead", { exact: true })).toHaveCount(1);

    await page.setViewportSize({ width: 375, height: 812 });
    for (const tab of ["quotes", "kyc", "documents", "policy"]) {
      await page.goto(`${leadUrl}?tab=${tab}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `sideways scroll on the ${tab} tab`).toBeLessThanOrEqual(0);
    }
    // Deal folds to its title on a phone and opens on tap
    const deal = page.locator("details", { hasText: "Deal" });
    await expect(deal.getByText("Recorded by finance")).toBeHidden();
    await deal.locator("summary").click();
    await expect(deal.getByText("Recorded by finance")).toBeVisible();
  });
});
