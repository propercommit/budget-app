import { prisma } from "@/lib/prisma";
import { AuthUser } from "@/lib/auth";

/**
 * Ensures the authenticated user has a `User` row before any write that
 * carries a `userId` foreign key.
 *
 * There are two systems of record: Supabase `auth.users` (authentication) and
 * the Prisma `User` table (data ownership). Auth survives database resets —
 * Prisma rows may not (e.g. `prisma migrate reset` wipes `public."User"` while
 * `auth.users` lives on), so a valid JWT is no proof that the `User` row
 * exists. Any route that creates a row with a `userId` FK must therefore be
 * self-healing: call this first, or the create fails with a P2003.
 *
 * Idempotent upsert keyed on the Supabase auth UID; on conflict it refreshes
 * the email, which also keeps the row in sync after an email change.
 */
export async function ensureUser(user: AuthUser): Promise<void> {
    await prisma.user.upsert({
        where: { id: user.id },
        update: { email: user.email ?? undefined },
        create: {
            id: user.id,
            email: user.email ?? `${user.id}@unknown.com`,
        },
    });
}
