import { expect, test } from "@playwright/test";
import { loginAs, pick } from "./helpers";

// The lists: counted tabs, filters in the URL, rows that open the record, bulk assign, and stacked rows on phones
test.describe("leads list", () => {
  test("tabs count, filters narrow through the URL and a row click opens the lead", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/leads");
    const main = page.getByRole("main");
    const stages = main.getByRole("navigation", { name: "Stage" });
    await expect(stages.getByRole("link", { name: /^All \d+$/ })).toHaveAttribute("aria-current", "page");

    await stages.getByRole("link", { name: /^Quoted \d+$/ }).click();
    await expect(page).toHaveURL(/filter=quoted/);
    await expect(
      main
        .getByRole("row")
        .filter({ has: page.getByRole("cell") })
        .filter({ hasNotText: "Quoted" }),
    ).toHaveCount(0);

    // Advisor filter keeps the stage tab
    const advisor = (await main.getByRole("row").nth(1).getByRole("cell").nth(5).innerText()).trim().split("\n").pop()!;
    await pick(page, "Advisor", advisor);
    await expect(page).toHaveURL(/advisor=(\d+|none)/);
    await expect(page).toHaveURL(/filter=quoted/);
    for (const row of await main
      .getByRole("row")
      .filter({ has: page.getByRole("cell") })
      .all()) {
      await expect(row).toContainText(advisor);
    }

    await main.getByRole("checkbox", { name: "Paid online only" }).click();
    await expect(page).toHaveURL(/paid=1/);

    // Clicking the product cell, not the name, still opens the lead
    await page.goto("/leads");
    // The row-wide link sits over the cell, so click where the user would rather than on the cell element
    const box = (await main.getByRole("row").nth(1).getByRole("cell").nth(2).boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page).toHaveURL(/\/leads\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  });

  test("manager assigns selected leads to an advisor", async ({ page }) => {
    await loginAs(page, "manager");
    await page.goto("/leads");
    const rows = page
      .getByRole("main")
      .getByRole("row")
      .filter({ has: page.getByRole("checkbox") });
    const references: string[] = [];
    for (const row of (await rows.all()).slice(0, 2)) {
      references.push((await row.getByText(/^[A-Z]{3}-[2-9A-HJKMNP-Z]{7}$/).textContent())!);
      await row.getByRole("checkbox").check();
    }
    expect(references).toHaveLength(2);

    await page.getByRole("toolbar", { name: "2 selected" }).getByRole("button", { name: "Assign advisor" }).click();
    const target = page.getByRole("menuitem").first();
    const name = (await target.innerText()).trim();
    await target.click();
    await expect(page.getByRole("toolbar")).toHaveCount(0);

    for (const reference of references) {
      await page.goto(`/leads?q=${reference}`);
      await expect(page.getByRole("main").getByRole("row").filter({ hasText: reference })).toContainText(name);
    }
  });

  test("on a phone each lead is one stacked link and nothing scrolls sideways", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await loginAs(page, "admin");
    await page.goto("/leads");
    await expect(page.getByRole("main").getByRole("table")).toBeHidden();
    const first = page.getByRole("main").getByRole("listitem").first().getByRole("link");
    await expect(first).toContainText(/[A-Z]{3}-[2-9A-HJKMNP-Z]{7}/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    await first.click();
    await expect(page).toHaveURL(/\/leads\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  });
});

test("policies fit a laptop screen and mark renewals due soon", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await loginAs(page, "admin");
  await page.goto("/policies");
  const overflow = await page
    .locator('[data-ui="DataTable"] table')
    .evaluate((table) => table.parentElement!.scrollWidth - table.parentElement!.clientWidth);
  expect(overflow).toBe(0);

  // The renewal demo policy is always due (an earlier spec may have renewed it, so check the tab's own count)
  const due = Number((await page.getByRole("link", { name: /^Renewal due \d+$/ }).innerText()).match(/\d+/)![0]);
  await page.goto("/policies?filter=renewal_due");
  await expect(page.getByRole("main").getByText("Due soon").filter({ visible: true })).toHaveCount(due);
});
