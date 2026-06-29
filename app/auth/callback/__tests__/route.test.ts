import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// --- Boundary mock --------------------------------------------------------
// The handler's only side-effecting dependency is the server Supabase client's
// `auth.exchangeCodeForSession`. Mock it (built in `vi.hoisted` so the hoisted
// `vi.mock` factory can reference it) and the handler runs in pure node — no
// cookies, no network.
const { exchangeCodeForSession } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession },
  })),
}));

import { GET } from "@/app/auth/callback/route";

const ORIGIN = "https://app.test";

// Build the OAuth callback Request. The handler derives `origin` from the
// request URL, so redirect targets are relative to ORIGIN.
function callbackRequest(query = ""): Request {
  return new Request(`${ORIGIN}/auth/callback${query}`, { method: "GET" });
}

let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  exchangeCodeForSession.mockResolvedValue({ error: null });
  // The handler logs on every path; silence it to keep test output clean.
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
});

describe("GET /auth/callback — OAuth provider error", () => {
  it("redirects to /login with the error code and never exchanges", async () => {
    const res = await GET(callbackRequest("?error=access_denied"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      `${ORIGIN}/login?error=access_denied`
    );
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("prefers the provider error over a present code", async () => {
    const res = await GET(
      callbackRequest("?error=access_denied&code=good-code")
    );
    expect(res.headers.get("location")).toBe(
      `${ORIGIN}/login?error=access_denied`
    );
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });
});

describe("GET /auth/callback — code exchange", () => {
  it("exchanges the code and redirects to the origin root by default", async () => {
    const res = await GET(callbackRequest("?code=good-code"));
    expect(exchangeCodeForSession).toHaveBeenCalledWith("good-code");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/`);
  });

  it("redirects to a valid same-origin ?next path on success", async () => {
    const res = await GET(callbackRequest("?code=good-code&next=/dashboard"));
    expect(res.headers.get("location")).toBe(`${ORIGIN}/dashboard`);
  });

  it("redirects to /login?error=auth_failed when the exchange errors", async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: { message: "bad code" },
    });
    const res = await GET(callbackRequest("?code=bad-code"));
    expect(res.headers.get("location")).toBe(
      `${ORIGIN}/login?error=auth_failed`
    );
  });
});

describe("GET /auth/callback — no code and no error", () => {
  it("redirects to /login?error=no_code", async () => {
    const res = await GET(callbackRequest(""));
    expect(res.headers.get("location")).toBe(`${ORIGIN}/login?error=no_code`);
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });
});

describe("GET /auth/callback — safeNext open-redirect guard", () => {
  it("honors a same-origin relative path", async () => {
    const res = await GET(
      callbackRequest("?code=good-code&next=/settings/profile")
    );
    expect(res.headers.get("location")).toBe(`${ORIGIN}/settings/profile`);
  });

  it("rejects a protocol-relative //evil.com to the root", async () => {
    const res = await GET(callbackRequest("?code=good-code&next=//evil.com"));
    expect(res.headers.get("location")).toBe(`${ORIGIN}/`);
  });

  it("rejects an absolute https://evil.com URL to the root", async () => {
    const res = await GET(
      callbackRequest("?code=good-code&next=https://evil.com")
    );
    expect(res.headers.get("location")).toBe(`${ORIGIN}/`);
  });
});
