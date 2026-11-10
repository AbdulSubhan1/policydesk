import { expect, test } from "@playwright/test";
import { loginAs, sidebar } from "./helpers";

test("each role sees only its own menu", async ({ page }) => {
  await loginAs(page, "admin");
  await expect(sidebar(page).getByRole("link", { name: "Roles" })).toBeVisible();
  await expect(sidebar(page).getByRole("link", { name: "Users" })).toBeVisible();

  await loginAs(page, "advisor");
  await expect(sidebar(page).getByRole("link", { name: "Leads" })).toBeVisible();
  await expect(sidebar(page).getByRole("link", { name: "Users" })).toHaveCount(0);
  await expect(sidebar(page).getByRole("link", { name: "KYC review" })).toHaveCount(0);

  await loginAs(page, "compliance");
  await expect(sidebar(page).getByRole("link", { name: "KYC review" })).toBeVisible();
  await expect(sidebar(page).getByRole("link", { name: "Opportunities" })).toHaveCount(0);
});

test("a page outside the role shows no access", async ({ page }) => {
  await loginAs(page, "advisor");
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "You don't have access to this page" })).toBeVisible();
});

test("an advisor gets 404 on a lead that is not theirs", async ({ page }) => {
  await loginAs(page, "advisor");
  // Collect the advisor's own leads from every page of the list
  const own: number[] = [];
  for (let n = 1; ; n++) {
    await page.goto(`/leads?page=${n}`);
    const ids = await page
      .locator('a[href^="/leads/"]')
      .evaluateAll((links) => links.map((a) => Number(a.getAttribute("href")!.split("/")[2])));
    if (ids.length === 0) break;
    own.push(...ids);
    if ((await page.getByRole("link", { name: "Next page" }).count()) === 0) break;
  }
  const other = Array.from({ length: 40 }, (_, i) => i + 1).find((id) => !own.includes(id))!;

  const response = await page.goto(`/leads/${other}`);
  expect(response?.status()).toBe(404);
});
