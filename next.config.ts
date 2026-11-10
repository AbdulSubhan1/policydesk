import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM files that must not be bundled
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: {
    // Document uploads go through server actions; files are capped at 2 MB in the action itself
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
