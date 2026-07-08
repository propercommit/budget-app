/**
 * Single source of truth for where avatar images live in Supabase Storage.
 *
 * The upload site (`app/account/page.tsx`) and the account-deletion cleanup
 * (`app/api/account/delete/route.ts`) must agree on this layout: cleanup finds
 * a user's files by listing `AVATARS_FOLDER` and matching the `<userId>-` name
 * prefix. Because cleanup is best-effort (failures are logged, not surfaced),
 * changing the layout in only one place would silently orphan files — change
 * it here, for both.
 */
export const AVATARS_BUCKET = "avatars";

export const AVATARS_FOLDER = "avatars";

/** Storage object path for a newly uploaded avatar. */
export function avatarFilePath(userId: string, fileExt: string | undefined): string {
    return `${AVATARS_FOLDER}/${userId}-${Date.now()}.${fileExt}`;
}

/** `list()` search term matching every avatar `userId` has uploaded. */
export function avatarSearchPrefix(userId: string): string {
    return `${userId}-`;
}
