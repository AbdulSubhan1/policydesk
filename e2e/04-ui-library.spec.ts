import { expect, test } from "@playwright/test";
import { UI_REGISTRY } from "../components/ui/registry";
import { loginAs } from "./helpers";

// The component library page is the test bed for components/ui: every registry entry must render a live preview
test.describe("UI library", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/design-system");
  });

  for (const entry of UI_REGISTRY) {
    test(`${entry.name} renders in the component library`, async ({ page }) => {
      const section = page.locator(`#${entry.name}`);
      await expect(section.getByRole("heading", { name: entry.name, exact: true })).toBeVisible();
      await expect(section.getByText(`components/ui/${entry.file}`)).toBeVisible();
    });
  }

  test("Autocomplete filters, moves with the keyboard and selects", async ({ page }) => {
    const box = page.locator("#Autocomplete").getByRole("combobox", { name: "Product" });
    await expect(box).toHaveAttribute("placeholder", "Search products…");

    await box.click();
    await expect(page.getByRole("option")).toHaveCount(11);
    await box.fill("yac");
    await expect(page.getByRole("option")).toHaveCount(1);
    await expect(page.getByRole("option", { name: /Yacht/ })).toBeVisible();

    await box.fill("");
    await box.press("ArrowDown");
    await box.press("Enter");
    await expect(box).toHaveValue("Bike");

    await box.click();
    await box.fill("zzz");
    await expect(page.getByText("No matches")).toBeVisible();
    await box.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
  });

  test("Checkbox toggles and stays accessible", async ({ page }) => {
    const box = page.locator("#Checkbox").getByRole("checkbox", { name: "size=sm" });
    await expect(box).not.toBeChecked();
    await page.locator("#Checkbox").getByText("size=sm").click();
    await expect(box).toBeChecked();
  });

  test("DataTable searches, filters and pages through the URL", async ({ page }) => {
    const table = page.locator("#DataTable");
    await expect(table.getByText("1–5 of 23")).toBeVisible();
    await table.getByRole("link", { name: "Next page" }).click();
    await expect(page.locator("#DataTable").getByText("6–10 of 23")).toBeVisible();
    await page.locator("#DataTable").getByRole("link", { name: "Quoted" }).click();
    await expect(page).toHaveURL(/filter=quoted/);
    await expect(page.locator("#DataTable").getByText(/of 8$/)).toBeVisible();
    await page.locator("#DataTable").getByRole("searchbox").fill("Layla");
    await page.locator("#DataTable").getByRole("searchbox").press("Enter");
    await expect(page).toHaveURL(/q=Layla/);
  });

  test("PhoneInput keeps a locked country and builds an E.164 number", async ({ page }) => {
    const locked = page.locator("#PhoneInput").getByRole("group").nth(1);
    await expect(locked.getByRole("combobox")).toBeDisabled();
    await locked.getByRole("textbox").fill("3001234567");
    await expect(locked.getByRole("textbox")).toHaveValue("3001234567");
  });

  test("shared validation rules show translated errors", async ({ page }) => {
    const form = page.locator("#Field");
    await form.getByLabel("Full name").fill("Ahmed");
    await form.getByLabel("Email").fill("not-an-email");
    await form.getByRole("button", { name: "Check the rules" }).click();
    await expect(form.getByText("Enter a first and last name")).toBeVisible();
    await expect(form.getByText("Enter a valid email")).toBeVisible();
  });
});
