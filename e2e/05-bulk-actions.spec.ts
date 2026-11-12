import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers";

// Bulk actions: tick rows in the leads table, then act on all of them from the ActionBar
test("manager moves selected leads to another stage", async ({ page }) => {
  await loginAs(page, "manager");
  await page.goto("/leads");
  // Won leads are closed and skipped by the action, so pick two open ones
  const open = page
    .getByRole("main")
    .getByRole("row")
    .filter({ has: page.getByRole("checkbox") })
    .filter({ hasNotText: /Won|Lost/ });
  const references: string[] = [];
  for (const row of (await open.all()).slice(0, 2)) {
    references.push((await row.getByText(/^[A-Z]{3}-[2-9A-HJKMNP-Z]{7}$/).textContent())!);
    await row.getByRole("checkbox").check();
  }
  expect(references).toHaveLength(2);

  const bar = page.getByRole("toolbar", { name: "2 selected" });
  await bar.getByRole("button", { name: "Move to stage" }).click();
  await page.getByRole("menuitem", { name: "Lost" }).click();
  await expect(page.getByRole("toolbar")).toHaveCount(0);

  for (const reference of references) {
    await page.goto(`/leads?filter=lost&q=${reference}`);
    // The phone rows repeat each reference (hidden on desktop), so look in the table
    await expect(page.getByRole("row").filter({ hasText: reference })).toBeVisible();
  }
});
