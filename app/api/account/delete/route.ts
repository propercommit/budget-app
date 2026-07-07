import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, revokeUserSessions } from "@/lib/auth";

const AVATARS_BUCKET = "avatars";
const AVATARS_FOLDER = "avatars";

/**
 * Builds a service-role Supabase client for admin operations. Reads
 * `SUPABASE_SERVICE_ROLE_KEY` (the name actually present in `.env`), falling
 * back to the legacy `SUPABASE_SERVICE_ROLE`, and throws when neither is set.
 * Call this BEFORE any destructive step so a misconfigured server fails fast
 * instead of leaving a half-deleted account.
 */
function getSupabaseAdmin(): SupabaseClient {

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;

    if (serviceRoleKey === undefined) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE) environment variable");

    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

/**
 * Best-effort removal of the user's uploaded avatar files (stored as
 * `avatars/<userId>-<timestamp>.<ext>` in the `avatars` bucket). Storage
 * cleanup must never block account deletion, so failures are logged and
 * swallowed. Receipts are not stored in Storage (they live as data URLs on
 * `SpendingEntry.receiptUrl`), so the DB cascade already covers them.
 */
async function deleteAvatarFiles(supabaseAdmin: SupabaseClient, userId: string): Promise<void> {

    const { data: files, error: listError } = await supabaseAdmin.storage
        .from(AVATARS_BUCKET)
        .list(AVATARS_FOLDER, { search: `${userId}-` });

    if (listError !== null) {
        console.error("Failed to list avatar files for deletion:", listError);
        return;
    }

    if (files === null || files.length === 0) return;

    const paths = files.map((file) => `${AVATARS_FOLDER}/${file.name}`);

    const { error: removeError } = await supabaseAdmin.storage.from(AVATARS_BUCKET).remove(paths);

    if (removeError !== null) console.error("Failed to remove avatar files:", removeError);
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

        await deleteAvatarFiles(supabaseAdmin, userId);

        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

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
