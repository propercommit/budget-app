import { createServerSupabaseClient } from "@/lib/supabase-server"
import { RECOVERY_COOKIE, RECOVERY_COOKIE_MAX_AGE, signRecoveryToken } from "@/lib/recovery"
import { NextResponse } from "next/server"

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
