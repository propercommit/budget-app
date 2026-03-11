import { redis } from "@/lib/redis";
import * as jose from "jose";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export interface AuthUser {
    id: string;
    email: string;
}

let cachedPublicKey: CryptoKey | null = null;

async function getPublicKey(): Promise<CryptoKey> {
    if (cachedPublicKey) return cachedPublicKey;

    const jwk = process.env.SUPABASE_JWT_PUBLIC_KEY;
    if (!jwk) throw new Error("[Auth] SUPABASE_JWT_PUBLIC_KEY is not set");

    const parsed = JSON.parse(jwk) as jose.JWK;
    cachedPublicKey = await jose.importJWK(parsed, "ES256") as CryptoKey;
    return cachedPublicKey;
}

async function extractTokenFromCookies(): Promise<string | null> {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => cookieStore.getAll(),
                setAll: () => {},
            },
        }
    );

    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
}

async function isTokenBlocked(jti: string): Promise<boolean> {
    const result = await redis.exists(`blocklist:${jti}`);
    return result === 1;
}

export async function getAuthenticatedUser(): Promise<AuthUser | null> {
    const token = await extractTokenFromCookies();
    if (!token) return null;

    try {
        const publicKey = await getPublicKey();

        const { payload } = await jose.jwtVerify(token, publicKey, {
            algorithms: ["ES256"],
        });

        const jti = payload.session_id as string;
        const userId = payload.sub;
        const email = payload.email;

        if (typeof jti !== "string" || typeof userId !== "string" || typeof email !== "string") {
            console.error("[Auth] JWT payload missing required claims");
            return null;
        }

        const blocked = await isTokenBlocked(jti);
        if (blocked) {
            console.warn(`[Auth] Blocked token used — jti: ${jti}`);
            return null;
        }

        return { id: userId, email };

    } catch (error) {
        if (error instanceof jose.errors.JWTExpired) return null;

        if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
            cachedPublicKey = null;
            console.warn("[Auth] JWT signature verification failed — possible key rotation, cache cleared");
            return null;
        }

        if (error instanceof jose.errors.JOSEError) return null;

        console.error("[Auth] Unexpected error during JWT verification:", error);
        return null;
    }
}

export async function blockToken(jti: string, expiresAt: number): Promise<void> {
    const ttl = expiresAt - Math.floor(Date.now() / 1000);
    if (ttl <= 0) return;
    await redis.set(`blocklist:${jti}`, "1", { ex: ttl });
}