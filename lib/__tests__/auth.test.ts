import { describe, it, expect, beforeEach, beforeAll, afterEach, vi } from "vitest";

// --- Boundary mocks -------------------------------------------------------
// `lib/auth.ts` talks to four boundaries: Redis (`@/lib/redis`), the cookie
// store (`next/headers`), the Supabase SSR client (only to read the access
// token out of the cookies — no network), and `jose` for JWT verification.
// All are mocked here so the gate logic runs in pure node.
//
// `jose` is mocked PARTIALLY: `jwtVerify`/`importJWK` are stubbed, but the real
// `jose.errors.*` classes are kept so the handler's `instanceof` error branches
// (expired / signature-failure) still match.
const { redisMock, cookiesMock, getSessionMock, jwtVerifyMock, importJWKMock } =
  vi.hoisted(() => ({
    redisMock: {
      exists: vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
    },
    cookiesMock: vi.fn(),
    getSessionMock: vi.fn(),
    jwtVerifyMock: vi.fn(),
    importJWKMock: vi.fn(async () => ({}) as CryptoKey),
  }));

vi.mock("@/lib/redis", () => ({ redis: redisMock }));
vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getSession: getSessionMock },
  })),
}));
vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();
  return { ...actual, jwtVerify: jwtVerifyMock, importJWK: importJWKMock };
});

// Imported after mocks are registered.
import { getAuthenticatedUser, markRecoverySession } from "@/lib/auth";

const RECOVERY_TTL_SECONDS = 24 * 60 * 60;

// A signature-verified payload. `session_id` (read as `jti`), `sub`, `email`
// and `iat` are the claims the gate inspects.
const VALID_PAYLOAD = {
  session_id: "sess-1",
  sub: "user-1",
  email: "user@example.com",
  iat: 1_700_000_000,
};

let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  // getPublicKey only needs a present, JSON-parseable value — importJWK is
  // mocked, so the JWK contents are irrelevant.
  process.env.SUPABASE_JWT_PUBLIC_KEY = '{"kty":"EC"}';
});

beforeEach(() => {
  vi.clearAllMocks();
  cookiesMock.mockResolvedValue({ getAll: () => [] });
  getSessionMock.mockResolvedValue({
    data: { session: { access_token: "access-token" } },
  });
  jwtVerifyMock.mockResolvedValue({ payload: { ...VALID_PAYLOAD } });
  // Defaults: nothing blocklisted, no revocation epoch, not a recovery session.
  redisMock.exists.mockResolvedValue(0);
  redisMock.get.mockResolvedValue(null);
  redisMock.set.mockResolvedValue("OK");
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
  errorSpy.mockRestore();
});

describe("getAuthenticatedUser — recovery-session gate", () => {
  it("returns null when the token's session_id is flagged as a recovery session", async () => {
    // blocklist:* → 0 (not blocked); recovery-session:* → 1 (flagged).
    redisMock.exists.mockImplementation(async (key: string) =>
      key.startsWith("recovery-session:") ? 1 : 0
    );

    const result = await getAuthenticatedUser();

    expect(result).toBeNull();
    expect(redisMock.exists).toHaveBeenCalledWith("recovery-session:sess-1");
  });

  it("returns the user when the same token is NOT flagged as a recovery session", async () => {
    // Default mocks: exists → 0 for every key, revoked-before → null. Only the
    // recovery-session flag differs from the test above.
    const result = await getAuthenticatedUser();

    expect(result).toEqual({ id: "user-1", email: "user@example.com" });
    expect(redisMock.exists).toHaveBeenCalledWith("recovery-session:sess-1");
    // The revoked-before epoch read must have returned null so this assertion
    // isolates the recovery-session flag as the only gate under test.
    expect(redisMock.get).toHaveBeenCalledWith("revoked-before:user-1");
  });

  it("fails CLOSED: returns null if the recovery-session lookup throws", async () => {
    // blocklist check succeeds (0), the recovery-session check throws.
    redisMock.exists.mockImplementation(async (key: string) => {
      if (key.startsWith("recovery-session:")) throw new Error("redis down");
      return 0;
    });

    const result = await getAuthenticatedUser();

    expect(result).toBeNull();
  });

  it("fails CLOSED: returns null if any redis.exists call throws", async () => {
    redisMock.exists.mockRejectedValue(new Error("redis down"));

    const result = await getAuthenticatedUser();

    expect(result).toBeNull();
  });
});

describe("getAuthenticatedUser — surrounding gates (regression guards)", () => {
  it("returns null with no token in cookies", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });

    const result = await getAuthenticatedUser();

    expect(result).toBeNull();
    expect(jwtVerifyMock).not.toHaveBeenCalled();
  });

  it("returns null when the token is blocklisted (checked before recovery)", async () => {
    redisMock.exists.mockImplementation(async (key: string) =>
      key.startsWith("blocklist:") ? 1 : 0
    );

    const result = await getAuthenticatedUser();

    expect(result).toBeNull();
    expect(redisMock.exists).toHaveBeenCalledWith("blocklist:sess-1");
  });

  it("returns null when the token predates the user's revocation epoch", async () => {
    // iat (1_700_000_000) is before the revoked-before stamp.
    redisMock.get.mockResolvedValue(1_700_000_001);

    const result = await getAuthenticatedUser();

    expect(result).toBeNull();
  });

  it("returns null when required JWT claims are missing", async () => {
    jwtVerifyMock.mockResolvedValue({ payload: { sub: "user-1" } });

    const result = await getAuthenticatedUser();

    expect(result).toBeNull();
  });

  it("returns null on an expired token without consulting redis", async () => {
    jwtVerifyMock.mockRejectedValue(
      new (await import("jose")).errors.JWTExpired("expired", {})
    );

    const result = await getAuthenticatedUser();

    expect(result).toBeNull();
    expect(redisMock.exists).not.toHaveBeenCalled();
  });
});

describe("markRecoverySession", () => {
  it("writes the recovery-session key with a 24h TTL", async () => {
    await markRecoverySession("sess-xyz");

    expect(redisMock.set).toHaveBeenCalledWith("recovery-session:sess-xyz", 1, {
      ex: RECOVERY_TTL_SECONDS,
    });
  });
});
