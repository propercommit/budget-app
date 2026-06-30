import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// --- Boundary mocks -------------------------------------------------------
// The confirm handler's boundaries: the Supabase server client (verifyOtp),
// the recovery cookie/token helpers (`@/lib/recovery`), the recovery-session
// marker (`@/lib/auth`), and `jose.decodeJwt`. All mocked in `vi.hoisted` so
// the hoisted `vi.mock` factories can reference them.
const { verifyOtp, signOut, markRecoverySession, signRecoveryToken, decodeJwt } =
  vi.hoisted(() => ({
    verifyOtp: vi.fn(),
    signOut: vi.fn(),
    markRecoverySession: vi.fn(),
    signRecoveryToken: vi.fn(() => "signed-marker"),
    decodeJwt: vi.fn(),
  }));

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { verifyOtp, signOut } })),
}));
vi.mock("@/lib/recovery", () => ({
  RECOVERY_COOKIE: "pw_recovery",
  RECOVERY_COOKIE_MAX_AGE: 600,
  signRecoveryToken,
}));
vi.mock("@/lib/auth", () => ({ markRecoverySession }));
vi.mock("jose", () => ({ decodeJwt }));

import { GET } from "@/app/auth/confirm/route";

const ORIGIN = "https://app.test";

function confirmRequest(query: string): Request {
  return new Request(`${ORIGIN}/auth/confirm${query}`, { method: "GET" });
}

let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  // Supabase signOut resolves the `{ error }` shape; default to success.
  signOut.mockResolvedValue({ error: null });
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
});

describe("GET /auth/confirm — recovery", () => {
  it("marks the recovery session, sets the cookie, and redirects to reset-password", async () => {
    verifyOtp.mockResolvedValue({
      data: {
        user: { id: "user-1" },
        session: { access_token: "access-jwt" },
      },
      error: null,
    });
    decodeJwt.mockReturnValue({ session_id: "sess-9" });

    const res = await GET(confirmRequest("?token_hash=abc&type=recovery"));

    expect(markRecoverySession).toHaveBeenCalledWith("sess-9");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/auth/reset-password`);
    expect(res.cookies.get("pw_recovery")?.value).toBe("signed-marker");
  });

  it("redirects to forgot-password and never marks when verifyOtp errors", async () => {
    verifyOtp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "invalid token" },
    });

    const res = await GET(confirmRequest("?token_hash=bad&type=recovery"));

    expect(res.headers.get("location")).toBe(
      `${ORIGIN}/auth/forgot-password?error=invalid_link`
    );
    expect(markRecoverySession).not.toHaveBeenCalled();
  });

  it("redirects to forgot-password when recovery verified but has no user", async () => {
    verifyOtp.mockResolvedValue({
      data: { user: null, session: { access_token: "access-jwt" } },
      error: null,
    });

    const res = await GET(confirmRequest("?token_hash=abc&type=recovery"));

    expect(res.headers.get("location")).toBe(
      `${ORIGIN}/auth/forgot-password?error=invalid_link`
    );
    expect(markRecoverySession).not.toHaveBeenCalled();
  });

  it("HARD-FAILS (signs out + redirects to forgot-password) when the session_id can't be decoded", async () => {
    verifyOtp.mockResolvedValue({
      data: {
        user: { id: "user-1" },
        session: { access_token: "access-jwt" },
      },
      error: null,
    });
    decodeJwt.mockImplementation(() => {
      throw new Error("bad jwt");
    });

    const res = await GET(confirmRequest("?token_hash=abc&type=recovery"));

    // Containment couldn't be established, so the session is torn down rather
    // than handed out leashed only by the deletable cookie.
    expect(markRecoverySession).not.toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(res.headers.get("location")).toBe(
      `${ORIGIN}/auth/forgot-password?error=try_again`
    );
    expect(res.cookies.get("pw_recovery")).toBeUndefined();
  });

  it("HARD-FAILS after retrying when recording containment keeps throwing (Redis down)", async () => {
    verifyOtp.mockResolvedValue({
      data: {
        user: { id: "user-1" },
        session: { access_token: "access-jwt" },
      },
      error: null,
    });
    decodeJwt.mockReturnValue({ session_id: "sess-9" });
    markRecoverySession.mockRejectedValue(new Error("redis down"));

    const res = await GET(confirmRequest("?token_hash=abc&type=recovery"));

    expect(markRecoverySession).toHaveBeenCalledTimes(3);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(res.headers.get("location")).toBe(
      `${ORIGIN}/auth/forgot-password?error=try_again`
    );
  });

  it("retries the teardown signOut on the hard-fail path before redirecting", async () => {
    verifyOtp.mockResolvedValue({
      data: {
        user: { id: "user-1" },
        session: { access_token: "access-jwt" },
      },
      error: null,
    });
    decodeJwt.mockReturnValue({ session_id: "sess-9" });
    markRecoverySession.mockRejectedValue(new Error("redis down"));
    // signOut blips once (returns an error) then succeeds — must not leave a
    // live session up, so it's retried.
    signOut
      .mockResolvedValueOnce({ error: { message: "blip" } })
      .mockResolvedValueOnce({ error: null });

    const res = await GET(confirmRequest("?token_hash=abc&type=recovery"));

    expect(signOut).toHaveBeenCalledTimes(2);
    expect(res.headers.get("location")).toBe(
      `${ORIGIN}/auth/forgot-password?error=try_again`
    );
  });
});

describe("GET /auth/confirm — non-recovery", () => {
  it("redirects an email change to /account without touching the recovery marker", async () => {
    verifyOtp.mockResolvedValue({
      data: { user: { id: "user-1" }, session: null },
      error: null,
    });

    const res = await GET(confirmRequest("?token_hash=abc&type=email_change"));

    expect(res.headers.get("location")).toBe(
      `${ORIGIN}/account?success=email_changed`
    );
    expect(markRecoverySession).not.toHaveBeenCalled();
  });

  it("redirects to /account?error=invalid_link when params are missing", async () => {
    const res = await GET(confirmRequest(""));

    expect(res.headers.get("location")).toBe(
      `${ORIGIN}/account?error=invalid_link`
    );
    expect(verifyOtp).not.toHaveBeenCalled();
  });
});
