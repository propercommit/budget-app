import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

import { createServerClient } from "@supabase/ssr";
import { proxy } from "@/proxy";

/** Stub the Supabase server client with a fixed getUser() result. */
function stubAuth(user: { id: string } | null) {
  vi.mocked(createServerClient).mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      signOut: vi.fn(),
    },
  } as unknown as ReturnType<typeof createServerClient>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("proxy — unauthenticated /api requests", () => {
  it("answers 401 JSON instead of redirecting to the login page", async () => {
    stubAuth(null);

    const response = await proxy(new NextRequest("http://localhost:3000/api/settings"));

    expect(response.status).toBe(401);

    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("still redirects unauthenticated page navigations to /login", async () => {
    stubAuth(null);

    const response = await proxy(new NextRequest("http://localhost:3000/account"));

    expect(response.status).toBe(307);

    expect(response.headers.get("location")).toBe("http://localhost:3000/login?redirect=%2Faccount");
  });

  it("lets authenticated API requests through to the route handler", async () => {
    stubAuth({ id: "user-1" });

    const response = await proxy(new NextRequest("http://localhost:3000/api/settings"));

    expect(response.status).toBe(200);

    expect(response.headers.get("location")).toBeNull();
  });
});
