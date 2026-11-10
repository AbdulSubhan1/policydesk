import { expect, test } from "@playwright/test";
import { loginAs, pick, SAMPLE_PNG } from "./helpers";

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
    await expect(page).toHaveURL(/\/leads\/\d+$/);
    leadUrl = new URL(page.url()).pathname;
    await expect(page.getByRole("heading", { name: customer })).toBeVisible();
  });

  test("advisor quotes, collects KYC and uploads documents", async ({ page }) => {
    await loginAs(page, "advisor");
    await page.goto(`${leadUrl}?tab=quotes`);
    const plan = page.getByRole("combobox", { name: "Plan" });
    await plan.click();
    await page.getByRole("option").first().click();
    await expect(page.getByLabel("Premium offered")).not.toHaveValue("");
    await page.getByRole("button", { name: "Add quote" }).click();
    await page.getByRole("button", { name: "Accepted" }).click();
    await expect(page.getByText("Accepted").first()).toBeVisible();

    await page.goto(`${leadUrl}?tab=kyc`);
    await page.getByLabel("ID or passport number").fill("ID-445566");
    await pick(page, "Nationality", "Pakistan");
    await page.getByLabel("Date of birth").fill("1990-04-12");
    await page.getByLabel("ID expiry").fill("2030-01-31");
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
      await page.getByLabel("File").setInputFiles(SAMPLE_PNG);
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
