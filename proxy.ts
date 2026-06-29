import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Route configuration
const PUBLIC_ROUTES = ["/login", "/auth"]
const AUTH_ROUTES = ["/login"]

function isPublicRoute(pathname: string): boolean {
    return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

function isAuthRoute(pathname: string): boolean {
    return AUTH_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Build a redirect that carries over any auth cookies Supabase refreshed
 * during getUser(). A bare NextResponse.redirect drops the cookies set on
 * `supabaseResponse`, desyncing the browser and server session — which
 * surfaces as OAuth needing a second click.
 */
function redirectWithAuthCookies(url: URL, from: NextResponse): NextResponse {
    const response = NextResponse.redirect(url)
    from.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
    return response
}

export async function proxy(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => 
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error) {
            console.error("[Middleware] Auth error:", error.message)
        }

        const pathname = request.nextUrl.pathname
        
        // Redirect unauthenticated users to login (except public routes)
        if (!user && !isPublicRoute(pathname)) {
            const url = request.nextUrl.clone()
            url.pathname = "/login"
            // Preserve the original URL to redirect back after login
            url.searchParams.set("redirect", pathname)
            return redirectWithAuthCookies(url, supabaseResponse)
        }

        // Redirect authenticated users away from auth pages
        if (user && isAuthRoute(pathname)) {
            const url = request.nextUrl.clone()
            const redirect = url.searchParams.get("redirect") || "/"
            url.pathname = redirect
            url.searchParams.delete("redirect")
            return redirectWithAuthCookies(url, supabaseResponse)
        }

        return supabaseResponse
    } catch (error) {
        console.error("[Middleware] Unexpected error:", error)
        // On error, allow request to proceed (fail open for better UX)
        // The page itself should handle auth state
        return supabaseResponse
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except static files:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico
         * - public assets (images, etc.)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
}