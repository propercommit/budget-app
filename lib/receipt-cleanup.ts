import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { RECEIPTS_BUCKET } from "@/lib/receipt-storage";

/** Storage remove() batch size for cascade cleanups (a category delete can span years of entries). */
const REMOVE_CHUNK_SIZE = 100;

/**
 * Best-effort removal of receipt objects after their entry rows died —
 * billing hygiene, never correctness: an orphaned object is unreachable
 * (reads mint URLs only from DB paths) and, for a live entry, self-heals by
 * overwrite. Never throws — a Storage failure (or even a missing service-role
 * key) must not block the deletion that already happened, so everything is
 * logged and swallowed, per the avatar-cleanup precedent.
 */
export async function removeReceiptObjects(paths: string[]): Promise<void> {

    if (paths.length === 0) return;

    try {
        const admin = getSupabaseAdmin();

        for (let i = 0; i < paths.length; i += REMOVE_CHUNK_SIZE) {
            const { error } = await admin.storage.from(RECEIPTS_BUCKET).remove(paths.slice(i, i + REMOVE_CHUNK_SIZE));

            if (error !== null) console.error("[Receipts] Failed to remove objects:", error);
        }
    } catch (error) {
        console.error("[Receipts] Cleanup failed:", error);
    }
}
