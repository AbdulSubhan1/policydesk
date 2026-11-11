import { defineConfig, devices } from "@playwright/test";
import {
  E2E_PAYSANDBOX_KEY,
  E2E_WEBHOOK_SECRET,
  E2E_WEBSITE_SECRET,
  E2E_WEBSITE_URL,
  FAKE_PAYSANDBOX_PORT,
} from "./e2e/website-client";

// E2E_PORT lets the suite run when 3070 is already taken on this machine
const PORT = Number(process.env.E2E_PORT ?? 3070);

// Tests share one seeded database and change it as they go, so they run one at a time in file order
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "en-US",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // Stands in for PaySandbox: checkout sessions, a Pay page and signed webhooks back to this server
      command: "node e2e/fake-paysandbox.mjs",
      url: `http://localhost:${FAKE_PAYSANDBOX_PORT}/health`,
      env: { E2E_PORT: String(PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `next dev -p ${PORT}`,
      url: `http://localhost:${PORT}/login`,
      env: {
        PGLITE_DIR: "./.pglite-e2e",
        WEBSITE_API_SECRET: E2E_WEBSITE_SECRET,
        PAYSANDBOX_API_URL: `http://localhost:${FAKE_PAYSANDBOX_PORT}/api/v1`,
        PAYSANDBOX_SECRET_KEY: E2E_PAYSANDBOX_KEY,
        PAYSANDBOX_WEBHOOK_SECRET: E2E_WEBHOOK_SECRET,
        WEBSITE_URL: E2E_WEBSITE_URL,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
