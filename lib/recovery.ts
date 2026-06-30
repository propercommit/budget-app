import { createHmac, timingSafeEqual } from "crypto"
import { RECOVERY_COOKIE, RECOVERY_COOKIE_MAX_AGE } from "@/lib/recovery-cookie"

// Re-export the cookie constants so existing importers of `@/lib/recovery`
// keep working. The values themselves live in the crypto-free
// `lib/recovery-cookie` module so the Edge runtime (proxy.ts) can import them
// without pulling in Node's `crypto`.
//
// The cookie value is NOT a static flag — HttpOnly only stops JS (XSS) forging,
// not a request-level actor (DevTools/curl) who already has the victim's
// session. Instead the value is an HMAC-signed, user-bound, expiring token that
// cannot be minted without the server secret, so only a genuine server-issued
// recovery event produces a value the reset endpoint will accept.
export { RECOVERY_COOKIE, RECOVERY_COOKIE_MAX_AGE }
const RECOVERY_TTL_MS = RECOVERY_COOKIE_MAX_AGE * 1000

// Server-only signing key. Prefer a dedicated secret so the recovery marker is
// not coupled to the high-value service-role key (key separation); fall back to
// the service-role key, which is present in the environment and never shipped to
// the client, so the flow works out of the box. Empty → verification fails
// closed (the feature breaks rather than accepting unsigned markers).
function secret(): string {
    return (
        process.env.RECOVERY_HMAC_SECRET ??
        process.env.SUPABASE_SERVICE_ROLE_KEY ??
        process.env.SUPABASE_SERVICE_ROLE ??
        ""
    )
}

function hmac(payload: string, key: string): string {
    return createHmac("sha256", key).update(payload).digest("base64url")
}

/**
 * Mint a recovery token bound to a specific user that expires `RECOVERY_TTL_MS`
 * from `nowMs`. Format: `base64url(userId.exp).signature`.
 */
export function signRecoveryToken(userId: string, nowMs: number): string {
    const key = secret()
    const payload = `${userId}.${nowMs + RECOVERY_TTL_MS}`
    const encoded = Buffer.from(payload).toString("base64url")
    return `${encoded}.${hmac(payload, key)}`
}

/**
 * Verify a recovery token's signature and expiry. When `expectedUserId` is
 * provided, also require the token to be bound to that user (the authorization
 * check the API performs against the live session). `nowMs` defaults to the
 * current time; callers pass it explicitly only for deterministic tests. Fails
 * closed.
 */
export function verifyRecoveryToken(
    token: string | undefined,
    expectedUserId?: string,
    nowMs: number = Date.now()
): boolean {
    const key = secret()
    if (!token || !key) return false

    const parts = token.split(".")
    if (parts.length !== 2) return false
    const [encoded, sig] = parts

    let payload: string
    try {
        payload = Buffer.from(encoded, "base64url").toString()
    } catch {
        return false
    }

    const expected = hmac(payload, key)
    const sigBuf = Buffer.from(sig)
    const expectedBuf = Buffer.from(expected)
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
        return false
    }

    const sep = payload.lastIndexOf(".")
    if (sep === -1) return false
    const tokenUserId = payload.slice(0, sep)
    const exp = Number(payload.slice(sep + 1))
    if (!Number.isFinite(exp) || exp < nowMs) return false
    if (expectedUserId !== undefined && tokenUserId !== expectedUserId) return false

    return true
}
