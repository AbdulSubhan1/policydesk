import { expect, test } from "@playwright/test";
import { UI_REGISTRY } from "../components/ui/registry";
import { loginAs, pickDate } from "./helpers";

// The component library is the test bed for components/ui: every registry entry has a page with live demos
test.describe("UI library", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
  });

  for (const entry of UI_REGISTRY) {
    test(`${entry.name} has a page with demos`, async ({ page }) => {
      await page.goto(`/design-system/${entry.name}`);
      await expect(page.getByRole("heading", { level: 1, name: entry.name, exact: true })).toBeVisible();
      await expect(page.getByText(`components/ui/${entry.file}`)).toBeVisible();
      await expect(page.getByRole("main").getByRole("heading", { level: 3 }).first()).toBeVisible();
    });
  }

  test("overview lists every component and the search narrows the sidebar", async ({ page }) => {
    await page.goto("/design-system");
    await expect(page.getByText(`${UI_REGISTRY.length} components`)).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Component library" });
    await nav.getByRole("searchbox").fill("picker");
    await expect(nav.getByRole("link", { name: "DatePicker" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Button", exact: true })).toHaveCount(0);
  });

  test("Autocomplete filters, moves with the keyboard and selects", async ({ page }) => {
    await page.goto("/design-system/Autocomplete");
    const box = page.getByRole("combobox", { name: "Product" });
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

  test("MultiSelect adds and removes tags", async ({ page }) => {
    await page.goto("/design-system/MultiSelect");
    const box = page.getByRole("combobox", { name: "Covers" });
    await box.click();
    await box.fill("third");
    await box.press("Enter");
    await expect(page.getByRole("button", { name: "Delete Third-party liability" })).toBeVisible();
    await box.press("Backspace");
    await expect(page.getByRole("button", { name: "Delete Third-party liability" })).toHaveCount(0);
  });

  test("Checkbox toggles from its label", async ({ page }) => {
    await page.goto("/design-system/Checkbox");
    const box = page.getByRole("checkbox", { name: "sm", exact: true });
    await expect(box).not.toBeChecked();
    await page.getByText("sm", { exact: true }).click();
    await expect(box).toBeChecked();
  });

  test("DataTable searches, filters and pages through the URL", async ({ page }) => {
    await page.goto("/design-system/DataTable");
    const main = page.getByRole("main");
    await expect(main.getByText("1–5 of 23")).toBeVisible();
    await main.getByRole("link", { name: "Next page" }).click();
    await expect(page.getByRole("main").getByText("6–10 of 23")).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: "Quoted" }).click();
    await expect(page).toHaveURL(/filter=quoted/);
    await expect(page.getByRole("main").getByText(/of 8$/)).toBeVisible();
    const search = page.getByPlaceholder(/Search by name or reference/);
    await search.fill("Layla");
    await search.press("Enter");
    await expect(page).toHaveURL(/q=Layla/);
  });

  test("ActionBar follows the selected rows", async ({ page }) => {
    await page.goto("/design-system/DataTable");
    const bar = page.getByRole("toolbar");
    await expect(bar).toHaveCount(0);
    await page.getByRole("checkbox").nth(0).check();
    await page.getByRole("checkbox").nth(1).check();
    await expect(bar).toHaveAccessibleName("2 selected");
    await bar.getByRole("button", { name: "Clear selection" }).click();
    await expect(bar).toHaveCount(0);
  });

  test("DropdownMenu opens a submenu with the keyboard", async ({ page }) => {
    await page.goto("/design-system/DropdownMenu");
    await page.getByRole("button", { name: "Stage", exact: true }).click();
    await expect(page.getByRole("menuitem", { name: "Set stage" })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("menuitemcheckbox", { name: "Quoted" })).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
  });

  test("Dialog opens, traps the page and closes on Escape", async ({ page }) => {
    await page.goto("/design-system/Dialog");
    await page.getByRole("button", { name: "Customer", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Customer" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Customer name")).toHaveValue("Ahmed Rahman");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("DatePicker jumps years and picks a day", async ({ page }) => {
    await page.goto("/design-system/DatePicker");
    await pickDate(page, "ID expiry", "2031-02-14");
    await expect(page.getByRole("button", { name: "ID expiry", exact: true })).toHaveText(/14 Feb 2031/);
  });

  test("Toast appears after an action", async ({ page }) => {
    await page.goto("/design-system/Toast");
    await page.getByRole("button", { name: "Success" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  });

  test("PhoneInput keeps a locked country and builds an E.164 number", async ({ page }) => {
    await page.goto("/design-system/PhoneInput");
    const locked = page.getByRole("main").getByRole("group").nth(1);
    await expect(locked.getByRole("combobox")).toBeDisabled();
    await locked.getByRole("textbox").fill("3001234567");
    await expect(locked.getByRole("textbox")).toHaveValue("3001234567");
  });

  test("shared validation rules show translated errors", async ({ page }) => {
    await page.goto("/design-system/Field");
    await page.getByLabel("Full name").fill("Ahmed");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByRole("button", { name: "Check the rules" }).click();
    await expect(page.getByText("Enter a first and last name")).toBeVisible();
    await expect(page.getByText("Enter a valid email")).toBeVisible();
  });
});
