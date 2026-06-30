import { createServerSupabaseClient } from "@/lib/supabase-server"
import { RECOVERY_COOKIE, RECOVERY_COOKIE_MAX_AGE, signRecoveryToken } from "@/lib/recovery"
import { markRecoverySession } from "@/lib/auth"
import { decodeJwt } from "jose"
import { NextResponse } from "next/server"

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Establishing containment is a hard precondition (see the recovery branch), so
// retry a transient Redis hiccup with a short backoff before giving up.
async function markRecoverySessionWithRetry(sessionId: string, attempts = 3): Promise<void> {
    let lastError: unknown
    for (let i = 0; i < attempts; i++) {
        try {
            await markRecoverySession(sessionId)
            return
        } catch (error) {
            lastError = error
            if (i < attempts - 1) await delay(50 * (i + 1))
        }
    }
    throw lastError
}

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const tokenHash = searchParams.get("token_hash")
    const type = searchParams.get("type")

    console.log("[Auth Confirm] Received:", { tokenHash: tokenHash ? "present" : "missing", type })

    if (tokenHash && type) {
        const supabase = await createServerSupabaseClient()

        const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "email_change" | "signup" | "recovery" | "email",
        })

        if (error) {
            console.error("[Auth Confirm] Verification error:", error.message)
            // Recovery failures must land on a public page — the user isn't
            // signed in, so /account would just bounce them to /login.
            if (type === "recovery") {
                return NextResponse.redirect(`${origin}/auth/forgot-password?error=invalid_link`)
            }
            return NextResponse.redirect(`${origin}/account?error=verification_failed`)
        }

        // Password recovery: verifyOtp established a short-lived recovery session.
        // Mark it with an HttpOnly, signed, user-bound token so only this genuine
        // recovery event can authorize the password change, and send the user to
        // the public reset page. The destination is hard-coded (no caller-supplied
        // `next`) so a recovery link can't be aimed anywhere else.
        if (type === "recovery") {
            const userId = data.user?.id
            if (!userId) {
                console.error("[Auth Confirm] Recovery verified but no user on session")
                return NextResponse.redirect(`${origin}/auth/forgot-password?error=invalid_link`)
            }

            // Contain this recovery session server-side BEFORE issuing it: record
            // its session_id so getAuthenticatedUser denies it on every normal
            // route, even if the pw_recovery cookie is stripped. This is a HARD
            // precondition — if we can't decode the session_id or record the flag
            // (Redis down), we refuse to hand out a session that would only be
            // leashed by the deletable cookie: sign it out and send the user back
            // to request a fresh link.
            const accessToken = data.session?.access_token
            let sessionId: string | undefined
            if (accessToken) {
                try {
                    const decoded = decodeJwt(accessToken).session_id
                    if (typeof decoded === "string") sessionId = decoded
                } catch (decodeError) {
                    console.error("[Auth Confirm] Failed to decode recovery session token:", decodeError)
                }
            }

            let contained = false
            if (sessionId) {
                try {
                    await markRecoverySessionWithRetry(sessionId)
                    contained = true
                } catch (markError) {
                    console.error("[Auth Confirm] Failed to record recovery containment:", markError)
                }
            }

            if (!contained) {
                // Tear down the just-established session so it can't roam uncontained.
                try {
                    await supabase.auth.signOut()
                } catch (signOutError) {
                    console.error("[Auth Confirm] Sign-out after containment failure failed:", signOutError)
                }
                return NextResponse.redirect(`${origin}/auth/forgot-password?error=try_again`)
            }

            const response = NextResponse.redirect(`${origin}/auth/reset-password`)
            response.cookies.set(RECOVERY_COOKIE, signRecoveryToken(userId, Date.now()), {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
                maxAge: RECOVERY_COOKIE_MAX_AGE,
            })
            return response
        }

        // Email change / signup confirmation — existing behavior.
        return NextResponse.redirect(`${origin}/account?success=email_changed`)
    }

    console.error("[Auth Confirm] Missing token_hash or type")
    return NextResponse.redirect(`${origin}/account?error=invalid_link`)
}
