import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1 MB, which rejected any form submission carrying a biodata PDF/photo over
      // that ("ERROR …@E394"). 4.5 MB matches Vercel's own request-body cap — the real ceiling;
      // see lib/upload-limits.ts. (Literal here, not imported: the config loads before app code.)
      bodySizeLimit: "4.5mb",
    },
  },
};

export default nextConfig;
