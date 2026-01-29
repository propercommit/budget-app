import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Creates a Supabase client for server-side operations.
 * Use this in API routes and Server Components.
 * 
 * @returns Supabase client configured with cookie-based auth
 */
export async function createServerSupabaseClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Expected when called from Server Components
                        // Cookie writes only work in Route Handlers and Server Actions
                    }
                },
            },
        }
    )
}

/**
 * Gets the authenticated user from the current session.
 * Returns null if not authenticated.
 * 
 * @returns User object or null
 */
export async function getAuthenticatedUser() {
    const supabase = await createServerSupabaseClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
        console.error("[Auth] Failed to get user:", error.message)
        return null
    }
    
    return user
}