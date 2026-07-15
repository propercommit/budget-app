import { NextResponse } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, revokeUserSessions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { AVATARS_BUCKET, AVATARS_FOLDER, avatarSearchPrefix } from "@/lib/avatar-storage";
import { RECEIPTS_BUCKET } from "@/lib/receipt-storage";

/** Storage list() page size for the receipts-folder sweep. */
const RECEIPT_LIST_PAGE_SIZE = 100;

/**
 * Best-effort removal of the user's uploaded avatar files (stored as
 * `avatars/<userId>-<timestamp>.<ext>` in the `avatars` bucket). Storage
 * cleanup must never block account deletion, so failures are logged and
 * swallowed. Receipt files live in the `receipts` bucket and get their own
 * sweep (`deleteReceiptFiles`).
 */
async function deleteAvatarFiles(supabaseAdmin: SupabaseClient, userId: string): Promise<void> {

    const { data: files, error: listError } = await supabaseAdmin.storage
        .from(AVATARS_BUCKET)
        .list(AVATARS_FOLDER, { search: avatarSearchPrefix(userId) });

    if (listError !== null) {
        console.error("Failed to list avatar files for deletion:", listError);
        return;
    }

    if (files === null || files.length === 0) return;

    const paths = files.map((file) => `${AVATARS_FOLDER}/${file.name}`);

    const { error: removeError } = await supabaseAdmin.storage.from(AVATARS_BUCKET).remove(paths);

    if (removeError !== null) console.error("Failed to remove avatar files:", removeError);
}

/**
 * Best-effort removal of the user's receipt files, stored one-per-entry at
 * `<userId>/<entryId>` in the private `receipts` bucket. Listing the uid
 * folder (rather than enumerating DB rows) is deliberate twice over: the
 * entry rows are already gone by the time this runs (the User cascade fired
 * first), and a folder sweep also catches uploaded-but-never-confirmed
 * orphans no DB row ever pointed at. Failures are logged and swallowed —
 * an orphaned object is unreachable and must never block account deletion.
 */
async function deleteReceiptFiles(supabaseAdmin: SupabaseClient, userId: string): Promise<void> {

    // Each removed page shifts the listing window, so always re-list from the
    // front instead of advancing an offset. The iteration cap only guards
    // against a Storage backend that reports success without deleting.
    for (let i = 0; i < 1000; i++) {
        const { data: files, error: listError } = await supabaseAdmin.storage
            .from(RECEIPTS_BUCKET)
            .list(userId, { limit: RECEIPT_LIST_PAGE_SIZE });

        if (listError !== null) {
            console.error("Failed to list receipt files for deletion:", listError);
            return;
        }

        if (files === null || files.length === 0) return;

        const paths = files.map((file) => `${userId}/${file.name}`);

        const { error: removeError } = await supabaseAdmin.storage.from(RECEIPTS_BUCKET).remove(paths);

        if (removeError !== null) {
            console.error("Failed to remove receipt files:", removeError);
            return;
        }

        if (files.length < RECEIPT_LIST_PAGE_SIZE) return;
    }
}

export async function DELETE() {
    try {
        const user = await getAuthenticatedUser();

        if (user === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Build the admin client before touching any data: a missing
        // service-role key aborts the whole operation up front instead of
        // wiping the DB and then failing to delete the auth user.
        const supabaseAdmin = getSupabaseAdmin();
        const userId = user.id;

        // One statement wipes the whole account: every relation hangs off User
        // with ON DELETE CASCADE (categories → spending items → entries,
        // income sources, settings), so the DB removes it all atomically.
        // deleteMany (vs delete) keeps a retry after a partial failure from
        // throwing P2025 once the row is already gone.
        await prisma.user.deleteMany({ where: { id: userId } });

        // Storage cleanup is best-effort and independent of the auth-user
        // delete, so run all of it concurrently instead of serializing extra
        // Storage round trips into the response.
        const [, , { error: authError }] = await Promise.all([
            deleteAvatarFiles(supabaseAdmin, userId),
            deleteReceiptFiles(supabaseAdmin, userId),
            supabaseAdmin.auth.admin.deleteUser(userId),
        ]);

        // 404 means the auth user is already gone (e.g. a retry after a
        // previous partial failure) — that is the desired end state. Any other
        // failure must surface: returning success would leave a login that can
        // lazily resurrect the User row on its next write.
        if (authError !== null && authError.status !== 404) {
            console.error("Failed to delete user from Supabase Auth:", authError);
            return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
        }

        // Outstanding JWTs still verify locally (lib/auth checks the signature,
        // not user existence), so revoke them all. Best-effort: if Redis is
        // down, every auth read already fails closed, so a failed write here
        // cannot leave a usable token.
        try {
            await revokeUserSessions(userId);
        } catch (revokeError) {
            console.error("Failed to revoke sessions after account deletion:", revokeError);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete account:", error);
        return NextResponse.json(
            { error: "Failed to delete account" },
            { status: 500 }
        );
    }
}
