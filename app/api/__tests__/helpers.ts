/**
 * Shared test support for API route-handler tests.
 *
 * Route handlers under `app/api/**` are thin wrappers around Prisma + the
 * local-JWT auth helper. These tests mock those two boundaries (and Supabase
 * for the account-delete route) so the handlers run in pure node with no
 * network or database.
 *
 * NOTE on mock construction: each test file builds its Prisma + auth mocks
 * inside a `vi.hoisted(() => …)` block (so the `vi.mock` factories — which are
 * hoisted to the top of the module — can reference them). That builder can't
 * live here because this module isn't initialised yet at hoist time. This file
 * only holds the parts that run at normal test time: fixtures and Request/
 * Response plumbing.
 */

/** Shape of the fake user returned by a mocked `getAuthenticatedUser`. */
export type FakeUser = { id: string; email: string | null };

export const FAKE_USER: FakeUser = {
  id: "user-123",
  email: "test@example.com",
};

/**
 * Build a plain `Request` with a JSON body. Handlers read the body via
 * `await request.json()`, so this is all they need.
 */
export function jsonRequest(
  body: unknown,
  init?: { method?: string }
): Request {
  return new Request("http://localhost/api/test", {
    method: init?.method ?? "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Build a GET `Request` with the given URL (query string included). Handlers
 * read query params via `new URL(request.url)` or `req.nextUrl.searchParams`.
 */
export function getRequest(url: string): Request {
  return new Request(url, { method: "GET" });
}

/** Wrap an `id` into the `{ params: Promise<{ id }> }` shape Next 16 passes. */
export function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

/** Read a NextResponse's parsed JSON body alongside its status. */
export async function readJson(
  res: Response
): Promise<{ status: number; body: unknown }> {
  const status = res.status;
  // 204 responses have no body.
  if (status === 204) return { status, body: null };
  const text = await res.text();
  return { status, body: text ? JSON.parse(text) : null };
}
