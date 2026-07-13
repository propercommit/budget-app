/**
 * Error thrown when the API answers a non-ok status. Carries the HTTP status
 * so callers can branch on expected failures (e.g. the 401 an unauthenticated
 * visitor gets on a public page) without matching on message text.
 *
 * Lives outside `lib/api.ts` on purpose: component tests stub that module
 * with plain `vi.mock` factories, and an `instanceof` against a class exported
 * from the mocked module would hit Vitest's missing-export proxy and throw.
 */
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}
