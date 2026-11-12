import { expect, test } from "@playwright/test";
import { SAMPLE_PNG, loginAs, pick, pickDate } from "./helpers";

// One customer from qualified opportunity to an active, paid policy, passing between five roles
test.describe.serial("opportunity to paid policy", () => {
  let leadUrl = "";
  let customer = "";

  test("coordinator converts a qualified opportunity", async ({ page }) => {
    await loginAs(page, "coordinator");
    await page.goto("/opportunities?filter=qualified");
    const first = page.locator('a[href^="/opportunities/"]:not([href$="/new"])').first();
    customer = (await first.textContent())!.trim();
    await first.click();

    await pick(page, "Advisor", "Aisha Khan");
    await page.getByRole("button", { name: "Convert" }).click();
    // Lead links use a UUID; people use the reference: product code + 7 characters
    await expect(page).toHaveURL(/\/leads\/[0-9a-f-]{36}$/);
    leadUrl = new URL(page.url()).pathname;
    await expect(page.getByRole("heading", { name: customer })).toBeVisible();
    const reference = (await page
      .getByText(/^[A-Z]{3}-[2-9A-HJKMNP-Z]{7}$/)
      .first()
      .textContent())!;

    await page.goto(`/leads?q=${reference}`);
    await expect(page.getByRole("link", { name: customer })).toHaveAttribute("href", leadUrl);
  });

  test("advisor quotes, collects KYC and uploads documents", async ({ page }) => {
    await loginAs(page, "advisor");
    await page.goto(`${leadUrl}?tab=quotes`);
    const plan = page.getByRole("combobox", { name: "Plan" });
    await plan.click();
    await page.getByRole("option").first().click();
    // The total fills in from the plan's price
    await expect(page.getByRole("row", { name: "Total a year" })).toContainText("$");
    await page.getByRole("button", { name: "Add quote" }).click();
    await page.getByRole("button", { name: "Customer accepted" }).click();
    await expect(page.getByText("Accepted").first()).toBeVisible();

    await page.goto(`${leadUrl}?tab=kyc`);
    await page.getByLabel("ID or passport number").fill("ID-445566");
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
      // Each upload removes nothing from the list, so pick the i-th required type every time
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
  });

  test("compliance approves the KYC", async ({ page }) => {
    await loginAs(page, "compliance");
    await page.goto("/kyc");
    const card = page.locator('[data-ui="Panel"]', { has: page.getByRole("link", { name: customer }) });
    await card.getByLabel("Note").fill("ID and documents verified");
    await card.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByRole("link", { name: customer })).toHaveCount(0);
  });

  test("advisor books the policy and finance records payment", async ({ page }) => {
    await loginAs(page, "advisor");
    await page.goto(`${leadUrl}?tab=policy`);
    await page.getByRole("button", { name: "Book policy" }).click();
    // Wait for the policy number: the word "Booked" is also on the progress rail before booking
    await expect(page.getByText(/^PD-\d{4}-\d{5}$/).first()).toBeVisible();

    await loginAs(page, "finance");
    await page.goto(`${leadUrl}?tab=policy`);
    await page.getByLabel("Reference").fill("TXN-E2E-1");
    await page.getByRole("button", { name: "Save payment" }).click();
    await expect(page.getByText("Payment Paid")).toBeVisible();
    await expect(page.getByText("Active").first()).toBeVisible();
  });
});
