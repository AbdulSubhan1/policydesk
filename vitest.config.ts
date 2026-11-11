import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests sit next to the code (*.test.ts); Playwright owns e2e/
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: { include: ["**/*.test.ts"], exclude: ["node_modules/**", "e2e/**", ".next/**"] },
});
