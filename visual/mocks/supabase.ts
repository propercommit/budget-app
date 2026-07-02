/**
 * CT stub for `@/lib/supabase`.
 *
 * The real module builds a Supabase browser client from `NEXT_PUBLIC_*` env
 * vars (absent in the harness) and hits the network on mount (`Header`, the
 * account page call `auth.getUser()`). For deterministic screenshots we return
 * a fixed signed-in user and no-op every auth/storage method — nothing in a
 * visual test submits a form, so the resolved shapes only need to be valid, not
 * functional.
 *
 * The email-provider `app_metadata` (not `google`) is deliberate: it makes the
 * account screen render the email/password cards and their modals, which are
 * part of the surface under test.
 */
import type { User } from "@supabase/supabase-js";

/** Deterministic signed-in user rendered by every authenticated screen. */
export const FAKE_USER: User = {
  id: "00000000-0000-0000-0000-000000000001",
  aud: "authenticated",
  email: "alex.morgan@example.com",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { first_name: "Alex", last_name: "Morgan" },
  created_at: "2026-01-01T00:00:00.000Z",
};

type AuthResult = { data: { user: User | null }; error: null };

const authResult: AuthResult = { data: { user: FAKE_USER }, error: null };

/**
 * Minimal structural shape of the Supabase browser client that the screens
 * under test actually touch. Runtime-only — app code still type-checks against
 * the real client via tsconfig paths, so this never has to be exhaustive.
 */
export function createClient() {
  return {
    auth: {
      getUser: () => Promise.resolve(authResult),
      getSession: () =>
        Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: {}, error: null }),
      signInWithOAuth: () => Promise.resolve({ data: {}, error: null }),
      signUp: () => Promise.resolve({ data: {}, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      updateUser: () => Promise.resolve({ data: { user: FAKE_USER }, error: null }),
      resetPasswordForEmail: () => Promise.resolve({ data: {}, error: null }),
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      }),
    },
  };
}
