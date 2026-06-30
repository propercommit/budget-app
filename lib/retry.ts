// Retry a flaky async operation with a short incremental backoff. Used for the
// best-effort-but-important Redis/auth writes in the password-recovery flow
// (session revocation, recovery-session marking, teardown signOut) so a
// transient Upstash/Supabase hiccup doesn't fail the whole operation back-to-back.
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < attempts - 1) await delay(50 * (i + 1));
        }
    }
    throw lastError;
}
