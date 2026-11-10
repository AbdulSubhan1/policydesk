import { expect, type Page } from "@playwright/test";

export const ROLES = {
  admin: "Admin",
  manager: "Department manager",
  coordinator: "Coordinator",
  advisor: "Advisor",
  compliance: "Compliance officer",
  finance: "Finance",
} as const;

/** Signs in with a demo role button on the login page. */
export async function loginAs(page: Page, role: keyof typeof ROLES) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByRole("button", { name: new RegExp(`^${ROLES[role]}\\b`) }).click();
  // The first sign-in also compiles the dashboard in dev mode, so allow time for it
  await expect(page).toHaveURL("/", { timeout: 30_000 });
}

/** The sidebar navigation of the signed-in user. */
export function sidebar(page: Page) {
  return page.getByRole("navigation", { name: "Main" });
}

/** Opens an Autocomplete found by its label, types to filter and picks the matching option. */
export async function pick(page: Page, label: string, option: string | RegExp) {
  const box = page.getByRole("combobox", { name: label });
  await box.click();
  if (typeof option === "string") await box.fill(option);
  await page.getByRole("option", { name: option }).first().click();
}

/** A tiny valid PNG to upload as a document. */
export const SAMPLE_PNG = {
  name: "scan.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  ),
};
