/**
 * Absolute origin of the deployed app, e.g. `https://budget-app.vercel.app`.
 *
 * Sourced from Vercel's injected `VERCEL_PROJECT_PRODUCTION_URL` (the project's
 * production domain, supplied without a protocol). Falls back to localhost for
 * local dev, where that variable is absent. Used to build the absolute URLs
 * required by the sitemap (`<loc>` entries) and the robots `Sitemap:` directive
 * — both of which reject relative paths.
 */
export function getSiteUrl(): string {

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (productionUrl !== undefined && productionUrl.length > 0) return `https://${productionUrl}`;

  return "http://localhost:3000";
}
