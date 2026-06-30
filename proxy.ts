import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { RECOVERY_COOKIE } from "@/lib/recovery-cookie"

// Route configuration
const PUBLIC_ROUTES = ["/login", "/auth"]
const AUTH_ROUTES = ["/login"]

// A password-recovery session (carrying the pw_recovery cookie) may ONLY reach
// the reset flow. Any other navigation means the recovery link is being used to
// roam the account — we tear the session down instead of letting it act as a
// full login (see F1).
const RECOVERY_ALLOWED_ROUTES = ["/auth/reset-password", "/api/auth/reset-password"]

function isPublicRoute(pathname: string): boolean {
    return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

function isAuthRoute(pathname: string): boolean {
    return AUTH_ROUTES.some(route => pathname.startsWith(route))
}

function isRecoveryAllowedRoute(pathname: string): boolean {
    return RECOVERY_ALLOWED_ROUTES.some(
        route => pathname === route || pathname.startsWith(`${route}/`)
    )
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

        // Contain password-recovery sessions: if the recovery marker is present
        // but the request is for anything other than the reset flow, keep the
        // session from being used to roam the app. Runs before the auth
        // redirects below so it also catches a recovery session bouncing off
        // /login into the app.
        if (request.cookies.get(RECOVERY_COOKIE) && !isRecoveryAllowedRoute(pathname)) {
            // Distinguish a real top-level navigation (the user actually trying
            // to roam to /account etc.) from a background request fired by the
            // app shell. The root layout's SettingsProvider does GET /api/settings
            // on EVERY page — including /auth/reset-password — so tearing the
            // session down on every disallowed request would kill the recovery
            // session a second after the reset page loads, and the reset POST
            // would always 401 ("link expired"). Sec-Fetch-Dest is a
            // browser-set, JS-unforgeable header, "document" only for navigations.
            const isNavigation = request.headers.get("sec-fetch-dest") === "document"
            if (!isNavigation) {
                // Block background/API access via a leaked recovery link without
                // destroying the session the legitimate reset POST still needs.
                return NextResponse.json({ error: "recovery_context" }, { status: 401 })
            }
            // A genuine navigation away from the reset flow — end the session so
            // an abandoned (or leaked) reset link can't become a roaming login.
            try {
                await supabase.auth.signOut()
            } catch (signOutError) {
                console.error("[Middleware] Recovery sign-out failed:", signOutError)
            }
            const url = request.nextUrl.clone()
            url.pathname = "/login"
            url.search = ""
            const response = redirectWithAuthCookies(url, supabaseResponse)
            response.cookies.set(RECOVERY_COOKIE, "", { maxAge: 0, path: "/" })
            return response
        }

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