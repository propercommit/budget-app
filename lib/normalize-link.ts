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

    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    return `https://${trimmed}`;
}
