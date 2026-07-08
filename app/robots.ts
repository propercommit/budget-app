import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Robots Exclusion Protocol directives served at /robots.txt.
 *
 * Policy: expose the public sign-in / auth surface to crawlers, keep the
 * authenticated dashboard, account area, and the API out of the crawl path.
 * Note this governs crawling, not indexing — it is advisory and not a security
 * boundary (the real gate is JWT auth in `lib/auth.ts`). Advertises the sitemap
 * so crawlers can discover the public pages.
 */
export default function robots(): MetadataRoute.Robots {

  return {
    rules: {
      userAgent: "*",
      allow: ["/login", "/auth"],
      disallow: ["/", "/account", "/api/"],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
