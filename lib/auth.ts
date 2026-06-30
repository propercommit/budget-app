import { redis } from "@/lib/redis";
import * as jose from "jose";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export interface AuthUser {
    id: string;
    email: string;
}

let cachedPublicKey: CryptoKey | null = null;

async function getPublicKey(): Promise<CryptoKey> {
    if (cachedPublicKey) return cachedPublicKey;

    const jwk = process.env.SUPABASE_JWT_PUBLIC_KEY;
    if (!jwk) throw new Error("[Auth] SUPABASE_JWT_PUBLIC_KEY is not set");

    const parsed = JSON.parse(jwk) as jose.JWK;
    cachedPublicKey = await jose.importJWK(parsed, "ES256") as CryptoKey;
    return cachedPublicKey;
}

async function extractTokenFromCookies(): Promise<string | null> {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => cookieStore.getAll(),
                setAll: () => {},
            },
        }
    );

    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
}

async function isTokenBlocked(jti: string): Promise<boolean> {
    const result = await redis.exists(`blocklist:${jti}`);
    return result === 1;
}

// Per-user revocation epoch. The blocklist above is keyed on a JWT's own
// session_id, so it can only revoke a token we hold — it cannot evict an
// attacker's stolen access token whose session_id we never see. After a
// password reset we instead stamp a "revoked before" timestamp for the user;
// any access token issued before it (the attacker's, and every other old
// device's) is rejected here even though its signature is still valid and it
// hasn't expired. A fresh post-reset sign-in mints a token with a newer `iat`,
// so the legitimate user is unaffected.
const REVOKED_BEFORE_PREFIX = "revoked-before:";

// Keep the marker long enough to outlive any access token that could have been
// issued before the reset. Supabase's default access-token TTL is 1h; 24h is a
// generous cushion for custom configs while still expiring on its own.
const REVOCATION_MARKER_TTL_SECONDS = 24 * 60 * 60;

async function revokedBeforeSeconds(userId: string): Promise<number | null> {
    const value = await redis.get<number>(`${REVOKED_BEFORE_PREFIX}${userId}`);
    return typeof value === "number" ? value : null;
}

/**
 * Invalidate every access token issued for `userId` up to now. Call this when a
 * user's password is reset/changed so that any previously-issued token (e.g. an
 * attacker's) stops authenticating immediately, instead of lingering until its
 * natural expiry. Idempotent; the marker self-expires.
 */
export async function revokeUserSessions(userId: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await redis.set(`${REVOKED_BEFORE_PREFIX}${userId}`, now, {
        ex: REVOCATION_MARKER_TTL_SECONDS,
    });
}

// A password-recovery session is a full Supabase session, but it must only ever
// be usable to COMPLETE the reset — never to act as a normal login. We record
// its `session_id` here when the recovery link is verified, and getAuthenticatedUser
// then denies any request bearing that session_id. This contains the recovery
// session server-side, by session, rather than via the `pw_recovery` cookie a
// request-level attacker could simply drop. It is scoped to the one session, so
// other devices and any future fresh login (different session_id) are unaffected;
// it outlives the access-token TTL so a token refresh (which keeps the same
// session_id) stays contained. The reset endpoints don't go through
// getAuthenticatedUser, so the legitimate reset still works.
const RECOVERY_SESSION_PREFIX = "recovery-session:";
// Re-armed on every hit (see getAuthenticatedUser), so an actively-used recovery
// session stays contained indefinitely; this base TTL only bounds a fully dormant
// session and keeps the key from lingering forever. Set well beyond any plausible
// Supabase session lifetime so a normally-paced flow never loses containment.
const RECOVERY_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * Mark a Supabase `session_id` as recovery-only, so getAuthenticatedUser refuses
 * to treat it as a normal login. Call right after a recovery `verifyOtp`.
 */
export async function markRecoverySession(sessionId: string): Promise<void> {
    await redis.set(`${RECOVERY_SESSION_PREFIX}${sessionId}`, 1, {
        ex: RECOVERY_SESSION_TTL_SECONDS,
    });
}

async function isRecoverySession(sessionId: string): Promise<boolean> {
    const result = await redis.exists(`${RECOVERY_SESSION_PREFIX}${sessionId}`);
    return result === 1;
}

export async function getAuthenticatedUser(): Promise<AuthUser | null> {
    const token = await extractTokenFromCookies();
    if (!token) return null;

    try {
        const publicKey = await getPublicKey();

        const { payload } = await jose.jwtVerify(token, publicKey, {
            algorithms: ["ES256"],
        });

        const jti = payload.session_id as string;
        const userId = payload.sub;
        const email = payload.email;
        const issuedAt = payload.iat;

        if (typeof jti !== "string" || typeof userId !== "string" || typeof email !== "string") {
            console.error("[Auth] JWT payload missing required claims");
            return null;
        }

        const blocked = await isTokenBlocked(jti);
        if (blocked) {
            console.warn(`[Auth] Blocked token used — jti: ${jti}`);
            return null;
        }

        // Reject tokens issued before a password reset/change for this user.
        const revokedBefore = await revokedBeforeSeconds(userId);
        if (revokedBefore !== null && typeof issuedAt === "number" && issuedAt < revokedBefore) {
            console.warn(`[Auth] Token predates a credential reset — user: ${userId}`);
            return null;
        }

        // Refuse to treat a password-recovery session as a normal login. The
        // reset endpoints bypass getAuthenticatedUser, so this only blocks the
        // recovery session from roaming the app / API — even if the pw_recovery
        // cookie was stripped.
        if (await isRecoverySession(jti)) {
            // Re-arm the flag so an actively-used recovery session can never
            // outlive its own containment; the base TTL only bounds a dormant one.
            await markRecoverySession(jti);
            console.warn(`[Auth] Recovery session used outside reset flow — session: ${jti}`);
            return null;
        }

        return { id: userId, email };

    } catch (error) {
        if (error instanceof jose.errors.JWTExpired) return null;

        if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
            cachedPublicKey = null;
            console.warn("[Auth] JWT signature verification failed — possible key rotation, cache cleared");
            return null;
        }

        if (error instanceof jose.errors.JOSEError) return null;

        console.error("[Auth] Unexpected error during JWT verification:", error);
        return null;
    }
}

export async function blockToken(jti: string, expiresAt: number): Promise<void> {
    const ttl = expiresAt - Math.floor(Date.now() / 1000);
    if (ttl <= 0) return;
    await redis.set(`blocklist:${jti}`, "1", { ex: ttl });
}