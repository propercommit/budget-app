/**
 * The one definition of "looks like an http(s) URL" — the entries routes
 * validate incoming links against it, and `normalizeLink` uses it to decide
 * whether a scheme prefix is needed. A single export keeps the client
 * transform and the server validation from drifting apart.
 */
export const HTTP_URL_REGEX = /^https?:\/\/.+/i;

/**
 * Normalizes a user-typed link for storage: trims whitespace, returns `null`
 * for an empty value, and prepends `https://` when no http(s) scheme is
 * present — so a bare `migros.ch` saves instead of failing the API's
 * "must start with http:// or https://" validation. Links that already carry
 * a scheme pass through unchanged (case-insensitive match).
 */
export function normalizeLink(raw: string): string | null {

    const trimmed = raw.trim();

    if (trimmed === "") return null;

    if (HTTP_URL_REGEX.test(trimmed)) return trimmed;

    return `https://${trimmed}`;
}
