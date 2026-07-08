import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Sitemap served at /sitemap.xml.
 *
 * Lists only the publicly crawlable, indexable entry pages. The auth-gated
 * dashboard and /account are omitted (crawlers can't reach them and robots.txt
 * disallows them), and so is /auth/reset-password — it is a dead-end without a
 * live recovery session, so there is nothing worth indexing there.
 */
export default function sitemap(): MetadataRoute.Sitemap {

  const baseUrl = getSiteUrl();

  return [
    { url: `${baseUrl}/login`, changeFrequency: "monthly", priority: 1 },
    { url: `${baseUrl}/auth/forgot-password`, changeFrequency: "yearly", priority: 0.5 },
  ];
}
