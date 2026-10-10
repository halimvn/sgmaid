import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

/** The public marketing pages only — nothing behind login belongs here. */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", "/about", "/services", "/contact"];
  return paths.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
