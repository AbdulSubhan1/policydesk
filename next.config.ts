import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM files that must not be bundled
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
