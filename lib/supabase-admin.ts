import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Builds a service-role Supabase client for admin operations. Reads
 * `SUPABASE_SERVICE_ROLE_KEY` (the name actually present in `.env`), falling
 * back to the legacy `SUPABASE_SERVICE_ROLE`, and throws when neither is set.
 * Call this BEFORE any destructive step so a misconfigured server fails fast
 * instead of leaving a half-finished mutation. The service role bypasses
 * Storage RLS entirely, so callers own every authorization check themselves.
 */
export function getSupabaseAdmin(): SupabaseClient {

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;

    if (serviceRoleKey === undefined) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE) environment variable");

    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
