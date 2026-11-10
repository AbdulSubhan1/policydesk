import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers";

test("manager renews a policy that is due", async ({ page }) => {
  await loginAs(page, "manager");
  await page.goto("/policies?filter=renewal_due");
  await page.getByRole("button", { name: "Renew" }).first().click();
  // The redirect lands on a lead page the dev server may still be compiling
  await expect(page).toHaveURL(/\/leads\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  await expect(page.getByText("Renewal", { exact: true })).toBeVisible();
  await expect(page.getByText(/^Renews PD-/)).toBeVisible();
});

test("switching to Arabic mirrors the layout", async ({ page }) => {
  await loginAs(page, "manager");
  await page.getByRole("button", { name: "Language" }).last().click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("أهلًا بك");

  await page.getByRole("button", { name: "اللغة" }).last().click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});
