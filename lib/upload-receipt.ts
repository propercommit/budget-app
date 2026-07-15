import { createClient } from "@/lib/supabase";
import { RECEIPTS_BUCKET } from "@/lib/receipt-storage";

/**
 * The browser→Storage upload leg of the receipt chain: sends the file
 * straight to the bucket with the signed token minted by
 * POST /api/entries/[id]/receipt (this is what bypasses the platform's
 * 4.5 MB function-body limit — the file never touches our API).
 *
 * Deliberately a one-function module: hook tests mock THIS seam. The
 * `@supabase/supabase-js` route-test mock precedent does not apply here —
 * `lib/supabase.ts` builds its client via `@supabase/ssr`.
 */
export async function uploadReceiptFile(path: string, token: string, file: File): Promise<void> {

    const supabase = createClient();

    const { error } = await supabase.storage
        .from(RECEIPTS_BUCKET)
        .uploadToSignedUrl(path, token, file, { contentType: file.type });

    if (error !== null) throw new Error(`Receipt upload failed: ${error.message}`);
}
