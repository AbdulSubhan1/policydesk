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
    await expect(page.getByRole("option")).toHaveCount(5);
    await box.fill("tr");
    await expect(page.getByRole("option")).toHaveCount(1);
    await expect(page.getByRole("option", { name: /Travel/ })).toBeVisible();

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
    const box = page.locator("#Checkbox").getByRole("checkbox", { name: "Cancel policies" });
    await expect(box).not.toBeChecked();
    await page.locator("#Checkbox").getByText("Cancel policies").click();
    await expect(box).toBeChecked();
  });
});
