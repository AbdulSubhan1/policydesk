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
  const leadLinks = async () =>
    page.locator('a[href^="/leads/"]').evaluateAll((links) => links.map((a) => a.getAttribute("href")!));

  // Collect the advisor's own leads from every page of the list
  await loginAs(page, "advisor");
  const own: string[] = [];
  for (let n = 1; ; n++) {
    await page.goto(`/leads?page=${n}`);
    own.push(...(await leadLinks()));
    if ((await page.getByRole("link", { name: "Next page" }).count()) === 0) break;
  }
  expect(own.length).toBeGreaterThan(0);

  await loginAs(page, "admin");
  await page.goto("/leads");
  const other = (await leadLinks()).find((href) => !own.includes(href))!;

  await loginAs(page, "advisor");
  expect((await page.goto(other))?.status()).toBe(404);
  // Numeric ids are not links any more
  expect((await page.goto("/leads/1"))?.status()).toBe(404);
});
