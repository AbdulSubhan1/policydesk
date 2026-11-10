import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // PGlite ships WASM files that must not be bundled
  serverExternalPackages: ["@electric-sql/pglite"],
  // The knowledge base reads these files at request time
  outputFileTracingIncludes: { "/kb/**": ["./docs/**", "./AGENTS.md"] },
  experimental: {
    // Document uploads go through server actions; files are capped at 2 MB in the action itself
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default createNextIntlPlugin("./i18n/request.ts")(nextConfig);
