import { createServerSupabaseClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get("code")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")
    const next = searchParams.get("next") ?? "/"

    console.log("[Auth Callback] Received:", { 
        code: code ? "present" : "missing", 
        error, 
        errorDescription 
    })

    if (error) {
        console.error("[Auth Callback] OAuth error:", error, errorDescription)
        return NextResponse.redirect(`${origin}/login?error=${error}`)
    }

    if (code) {
        const supabase = await createServerSupabaseClient()
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        
        if (exchangeError) {
            console.error("[Auth Callback] Exchange error:", exchangeError.message)
            return NextResponse.redirect(`${origin}/login?error=auth_failed`)
        }

        return NextResponse.redirect(`${origin}${next}`)
    }

    console.error("[Auth Callback] No code received")
    return NextResponse.redirect(`${origin}/login?error=no_code`)
}