import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { jsonRequest, readJson } from "../../../__tests__/helpers";

// --- Boundary mocks -------------------------------------------------------
// The route's boundaries: the Supabase server client (getUser/updateUser/
// signOut), the recovery-token verifier (`@/lib/recovery`), the session
// revocation writer (`@/lib/auth`), and the cookie store (`next/headers`).
// All mocked in `vi.hoisted` so the hoisted `vi.mock` factories can reference
// them.
const {
  getUser,
  updateUser,
  signOut,
  verifyRecoveryToken,
  revokeUserSessions,
  cookiesGet,
} = vi.hoisted(() => ({
  getUser: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  verifyRecoveryToken: vi.fn(),
  revokeUserSessions: vi.fn(),
  cookiesGet: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser, updateUser, signOut },
  })),
}));
vi.mock("@/lib/recovery", () => ({
  RECOVERY_COOKIE: "pw_recovery",
  verifyRecoveryToken,
}));
vi.mock("@/lib/auth", () => ({ revokeUserSessions }));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookiesGet })),
}));

import { POST } from "@/app/api/auth/reset-password/route";

const VALID_PASSWORD = "new-password-123";

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  // Happy-path defaults: a marker cookie, a live session user, a valid recovery
  // token, successful revocation + update + signout.
  cookiesGet.mockReturnValue({ value: "signed-marker" });
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  verifyRecoveryToken.mockReturnValue(true);
  revokeUserSessions.mockResolvedValue(undefined);
  updateUser.mockResolvedValue({ error: null });
  signOut.mockResolvedValue({ error: null });
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe("POST /api/auth/reset-password — happy path", () => {
  it("revokes, updates the password, signs out, and clears the cookie", async () => {
    const res = await POST(jsonRequest({ password: VALID_PASSWORD }));
    const { status, body } = await readJson(res);

    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(revokeUserSessions).toHaveBeenCalledTimes(1);
    expect(revokeUserSessions).toHaveBeenCalledWith("user-1");
    expect(updateUser).toHaveBeenCalledWith({ password: VALID_PASSWORD });
    expect(signOut).toHaveBeenCalledTimes(1);

    // The pw_recovery cookie is cleared so the link can't be reused.
    const cleared = res.cookies.get("pw_recovery");
    expect(cleared?.value).toBe("");
    expect(cleared?.maxAge).toBe(0);
  });
});

describe("POST /api/auth/reset-password — revocation is a hard precondition", () => {
  it("returns 500 and NEVER changes the password when revocation keeps failing", async () => {
    revokeUserSessions.mockRejectedValue(new Error("redis down"));

    const res = await POST(jsonRequest({ password: VALID_PASSWORD }));
    const { status, body } = await readJson(res);

    expect(status).toBe(500);
    expect(body).toEqual({
      error: "Could not complete the reset. Please try again.",
    });
    // The whole point: the password is NOT changed and the session is NOT torn
    // down when we couldn't record the revocation.
    expect(updateUser).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    // revokeWithRetry attempts 3 times before giving up.
    expect(revokeUserSessions).toHaveBeenCalledTimes(3);
  });

  it("retries a transient revocation failure then succeeds", async () => {
    revokeUserSessions
      .mockRejectedValueOnce(new Error("blip"))
      .mockResolvedValueOnce(undefined);

    const res = await POST(jsonRequest({ password: VALID_PASSWORD }));
    const { status } = await readJson(res);

    expect(status).toBe(200);
    expect(revokeUserSessions).toHaveBeenCalledTimes(2);
    expect(updateUser).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/auth/reset-password — auth/recovery preconditions", () => {
  it("returns 403 with no session user, without revoking", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(jsonRequest({ password: VALID_PASSWORD }));
    const { status, body } = await readJson(res);

    expect(status).toBe(403);
    expect(body).toEqual({ error: "invalid_recovery_context" });
    expect(revokeUserSessions).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("returns 403 when the recovery token does not verify, without revoking", async () => {
    verifyRecoveryToken.mockReturnValue(false);

    const res = await POST(jsonRequest({ password: VALID_PASSWORD }));
    const { status, body } = await readJson(res);

    expect(status).toBe(403);
    expect(body).toEqual({ error: "invalid_recovery_context" });
    expect(verifyRecoveryToken).toHaveBeenCalledWith("signed-marker", "user-1");
    expect(revokeUserSessions).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/reset-password — input validation", () => {
  it("returns 400 for a too-short password, before any revocation", async () => {
    const res = await POST(jsonRequest({ password: "short" }));
    const { status } = await readJson(res);

    expect(status).toBe(400);
    expect(revokeUserSessions).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("returns 400 for a too-long password", async () => {
    const res = await POST(jsonRequest({ password: "a".repeat(129) }));
    const { status } = await readJson(res);

    expect(status).toBe(400);
    expect(updateUser).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/reset-password — provider update failure", () => {
  it("returns 400 and does not sign out when updateUser errors (revocation already done)", async () => {
    updateUser.mockResolvedValue({ error: { message: "weak password" } });

    const res = await POST(jsonRequest({ password: VALID_PASSWORD }));
    const { status, body } = await readJson(res);

    expect(status).toBe(400);
    expect(body).toEqual({
      error: "Could not update password. Please try again.",
    });
    expect(revokeUserSessions).toHaveBeenCalledTimes(1);
    expect(signOut).not.toHaveBeenCalled();
  });
});
