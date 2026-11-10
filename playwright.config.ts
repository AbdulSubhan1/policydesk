import { defineConfig, devices } from "@playwright/test";

const PORT = 3070;

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
  webServer: {
    command: `next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    env: { PGLITE_DIR: "./.pglite-e2e" },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
