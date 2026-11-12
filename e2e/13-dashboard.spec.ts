import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers";

// The dashboard says what to do first, then shows the period's numbers
test("admin sees tasks that link to their lists and switches the period", async ({ page }) => {
  await loginAs(page, "admin");
  const today = page.getByRole("region", { name: "Needs you today" });
  for (const label of ["KYC checks waiting", "Payments to record", "Leads to assign", "Renewals coming up"]) {
    await expect(today.getByRole("link", { name: new RegExp(label) })).toBeVisible();
  }

  // The KYC card's count is the queue on the KYC review page
  await today.getByRole("link", { name: /KYC checks waiting/ }).click();
  await expect(page).toHaveURL(/\/kyc$/);

  await page.goto("/");
  const period = page.getByRole("navigation", { name: "Period" });
  await expect(period.getByRole("link", { name: "This month" })).toHaveAttribute("aria-current", "page");
  await period.getByRole("link", { name: "Year" }).click();
  await expect(page).toHaveURL(/period=year/);
  await expect(page.getByRole("heading", { name: `${new Date().getFullYear()} so far` })).toBeVisible();
  // One sale is not a rate: either "N won of M closed" or the not-enough-data note
  await expect(page.getByText(/\d+ won of \d+ closed|Not enough data yet/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lead pipeline" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Where opportunities come from" })).toBeVisible();
});

test("an advisor gets their own tasks, not the reviewers'", async ({ page }) => {
  await loginAs(page, "advisor");
  const today = page.getByRole("region", { name: "Needs you today" });
  await expect(today.getByRole("link", { name: /KYC to send/ })).toBeVisible();
  await expect(today.getByRole("link", { name: /Leads to quote/ })).toHaveAttribute(
    "href",
    "/leads?filter=needs_analysis",
  );
  await expect(today.getByRole("link", { name: /KYC checks waiting/ })).toHaveCount(0);
  await expect(today.getByRole("link", { name: /Payments to record/ })).toHaveCount(0);
  // Advisors see no opportunities, so no source breakdown either
  await expect(page.getByRole("heading", { name: "Where opportunities come from" })).toHaveCount(0);
});
