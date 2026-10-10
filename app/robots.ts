import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

/** Public marketing pages are crawlable; the portal, admin and API are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/api", "/post-login", "/setup-password", "/reset-password", "/helpers"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
