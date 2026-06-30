import { createServerSupabaseClient } from "@/lib/supabase-server"
import { RECOVERY_COOKIE, verifyRecoveryToken } from "@/lib/recovery"
import { revokeUserSessions } from "@/lib/auth"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const MIN_PASSWORD_LENGTH = 8
// Match the rest of the app's amount/string caps philosophy: bound the input so
// an oversized body can't be used to abuse the upstream auth provider.
const MAX_PASSWORD_LENGTH = 128

// Revocation must actually be recorded, so retry a transient Redis hiccup before
// giving up. The whole app already hard-depends on Redis for auth, so treating a
// persistent failure as fatal (below) adds no new failure surface.
async function revokeWithRetry(userId: string, attempts = 3): Promise<void> {
    let lastError: unknown
    for (let i = 0; i < attempts; i++) {
        try {
            await revokeUserSessions(userId)
            return
        } catch (error) {
            lastError = error
        }
    }
    throw lastError
}

/**
 * Completes a password reset. This endpoint deliberately requires BOTH:
 *  1. An active Supabase session.
 *  2. A signed, unexpired `pw_recovery` token (set by /auth/confirm after a
 *     successful recovery verifyOtp) that is BOUND to that session's user.
 *
 * An ordinary authenticated user has the session but no valid recovery token,
 * so they cannot change their password here without the current one — that flow
 * lives in account settings and re-authenticates first. The token is HMAC-signed
 * with a server-only secret, so it can't be minted or forged at the request
 * level (DevTools/curl), and SameSite=Lax blocks cross-site (CSRF) replay.
 */
export async function POST(request: Request) {
    try {
        const cookieStore = await cookies()
        const marker = cookieStore.get(RECOVERY_COOKIE)?.value

        const supabase = await createServerSupabaseClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "invalid_recovery_context" }, { status: 403 })
        }

        // Require a signed, unexpired marker BOUND to this exact session user. A
        // forged or copied flag, an expired one, or one minted for another user
        // all fail here — so an ordinary session can't be used to reset.
        if (!verifyRecoveryToken(marker, user.id)) {
            return NextResponse.json(
                { error: "invalid_recovery_context" },
                { status: 403 }
            )
        }

        let body: unknown
        try {
            body = await request.json()
        } catch {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 })
        }

        const password = (body as { password?: unknown })?.password
        if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
            return NextResponse.json(
                { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
                { status: 400 }
            )
        }
        if (password.length > MAX_PASSWORD_LENGTH) {
            return NextResponse.json(
                { error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters` },
                { status: 400 }
            )
        }

        // Evict any access token issued before this reset — including a stolen
        // one an attacker may be holding — so recovering the account actually
        // locks everyone else out, not just after the token's natural expiry.
        // Done BEFORE the password change and treated as a hard precondition: if
        // we can't record the revocation we abort, rather than silently leaving a
        // stolen token valid after telling the user their account is secured. The
        // fresh post-reset sign-in mints a newer token, so the user is unaffected.
        try {
            await revokeWithRetry(user.id)
        } catch (revokeError) {
            console.error("[Reset Password] Session revocation failed:", revokeError)
            return NextResponse.json(
                { error: "Could not complete the reset. Please try again." },
                { status: 500 }
            )
        }

        const { error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) {
            console.error("[Reset Password] Update failed:", updateError.message)
            // Don't echo provider internals; give a safe, actionable message.
            return NextResponse.json(
                { error: "Could not update password. Please try again." },
                { status: 400 }
            )
        }

        // Invalidate the recovery session and clear the marker so the link can't
        // be reused, forcing a fresh sign-in with the new password.
        await supabase.auth.signOut()

        const response = NextResponse.json({ success: true })
        response.cookies.set(RECOVERY_COOKIE, "", { maxAge: 0, path: "/" })
        return response
    } catch (error) {
        console.error("[Reset Password] Unexpected error:", error)
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
    }
}
