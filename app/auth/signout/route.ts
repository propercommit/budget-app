import { createServerSupabaseClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

// Sign out server-side so the auth cookies are cleared by Set-Cookie
// headers we control — including the chunked sb-* cookies the browser
// client can miss. A leftover cookie is what makes the next OAuth
// sign-in fail on the first click.
export async function POST() {
    const supabase = await createServerSupabaseClient()
    await supabase.auth.signOut()
    return NextResponse.json({ success: true })
}