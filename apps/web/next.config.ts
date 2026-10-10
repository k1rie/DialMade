import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Workspace packages ship TS/TSX source (and the UI ones, CSS imports).
  transpilePackages: ["@dialmade/palette", "@dialmade/catalog", "@dialmade/doc", "@dialmade/import", "@dialmade/layout", "@dialmade/ui", "@dialmade/sections"],
};

export default nextConfig;
