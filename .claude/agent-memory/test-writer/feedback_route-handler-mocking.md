---
name: route-handler-mocking
description: How to mock Prisma + auth for app/api route-handler tests in this repo (vi.hoisted pattern, reading NextResponse bodies)
metadata:
  type: feedback
---

When unit-testing `app/api/**/route.ts` handlers, mock the boundaries this way (validated in the API-route test PR — all passed):

**Build mocks inside `vi.hoisted`, not as module-scope consts.** `vi.mock(...)` factories are hoisted above all imports, so a plain `const prismaMock = ...` referenced inside the factory throws `Cannot access 'prismaMock' before initialization`. Instead:
```ts
const { prismaMock, getAuthenticatedUser } = vi.hoisted(() => {
  const model = () => ({ findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(),
    create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn() });
  return { prismaMock: { category: model(), spendingItem: model(), /* … */ }, getAuthenticatedUser: vi.fn() };
});
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUser }));
```
The Prisma-mock builder must be INLINE in the hoisted callback — an imported `createPrismaMock()` isn't initialised at hoist time. Shared fixtures that run at normal test time (FAKE_USER, request builders, `readJson`) live in `app/api/__tests__/helpers.ts`.

**Why:** these handlers only touch two boundaries — `@/lib/auth` `getAuthenticatedUser` and `@/lib/prisma`. (The account-delete route also needs `@supabase/supabase-js` `createClient` mocked.) No route reads Redis directly. Mocking just these runs every handler in pure node with no DB/network.

**How to apply:**
- Invoke handlers directly: `await POST(jsonRequest(body))`. Dynamic routes take a second arg `{ params: Promise.resolve({ id }) }` (Next 16 params are async).
- Read responses with a helper that does `res.status` + `JSON.parse(await res.text())`; handle 204 (income DELETE) which has no body. `NextResponse.json` works fine in the node env.
- `console.error`/`console.log` noise on error-path tests is the route's own logging — expected, not a failure.
- Related: [[vitest-forks-pool]], [[api-routes-no-p2002-catch]].
