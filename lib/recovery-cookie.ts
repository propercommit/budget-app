// Pure constants for the password-recovery marker cookie. Kept free of any
// Node-only imports (e.g. `crypto`) so this module is safe to import from the
// Edge runtime (proxy.ts) — unlike lib/recovery.ts, which does the HMAC work.

// Short-lived HttpOnly marker proving the current Supabase session was
// established via a password-recovery link. See lib/recovery.ts for the signed
// token format and verification.
export const RECOVERY_COOKIE = "pw_recovery"

// 15 minutes — long enough to set a new password, short enough that a stray
// recovery session doesn't linger.
export const RECOVERY_COOKIE_MAX_AGE = 900
