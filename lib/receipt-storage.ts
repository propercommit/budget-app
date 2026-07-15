/**
 * Single source of truth for where receipt files live in Supabase Storage and
 * the size limits that govern them. Client-safe: imported by the API route,
 * the upload hook, and the read hook, so all three agree on the bucket, the
 * object layout, and the signed-URL lifetime.
 *
 * Object layout: one object per entry at the FIXED key `<userId>/<entryId>`
 * (D27). Reads mint signed URLs only from `SpendingEntry.receiptPath`, so an
 * uploaded-but-never-confirmed object is unreachable and self-heals when the
 * next upload overwrites the same key. Changing this layout breaks every
 * deletion-cleanup path — change it here, for all of them.
 */
export const RECEIPTS_BUCKET = "receipts";

/** Storage-layer per-object cap; mirrored by the bucket's `file_size_limit`. */
export const MAX_RECEIPT_BYTES = 10_485_760;

/**
 * Per-user cap (50 MB), enforced against the DB-recorded sum of
 * `receiptSizeBytes` — an abuse bound, not a user-facing quota.
 */
export const RECEIPT_QUOTA_BYTES = 52_428_800;

/**
 * Lifetime of signed read URLs. The client caches a minted URL for a popin
 * session and computes its own expiry from this same constant, so the GET
 * response body only needs to carry the URL.
 */
export const RECEIPT_SIGNED_URL_TTL_SECONDS = 600;

/** The fixed Storage object key for an entry's receipt (bucket not included). */
export function receiptObjectPath(userId: string, entryId: string): string {
    return `${userId}/${entryId}`;
}
