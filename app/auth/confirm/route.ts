import { createServerSupabaseClient } from "@/lib/supabase-server"
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

        console.log("[Auth Confirm] verifyOtp result:", { data, error })

        if (error) {
            console.error("[Auth Confirm] Verification error:", error.message)
            return NextResponse.redirect(`${origin}/account?error=verification_failed`)
        }

        // Get the updated user
        const { data: userData } = await supabase.auth.getUser()
        console.log("[Auth Confirm] Updated user email:", userData?.user?.email)

        // Success - redirect to account page
        return NextResponse.redirect(`${origin}/account?success=email_changed`)
    }

    console.error("[Auth Confirm] Missing token_hash or type")
    return NextResponse.redirect(`${origin}/account?error=invalid_link`)
}