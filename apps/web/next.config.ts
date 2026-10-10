import type { NextConfig } from "next";
import { appSecurityHeaders } from "./src/lib/security/csp";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Workspace packages ship TS/TSX source (and the UI ones, CSS imports).
  transpilePackages: ["@dialmade/ai-render", "@dialmade/palette", "@dialmade/catalog", "@dialmade/doc", "@dialmade/import", "@dialmade/layout", "@dialmade/ui", "@dialmade/sections", "@dialmade/handoff"],
  // CSP: BYOK may only reach api.anthropic.com, and the only frames are the AI islands of the preview origin.
  async headers() {
    const headers = appSecurityHeaders({
      previewOrigin: process.env.NEXT_PUBLIC_PREVIEW_ORIGIN,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      dev: process.env.NODE_ENV !== "production",
    });
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
