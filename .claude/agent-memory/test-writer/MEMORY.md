# Test-Writer Memory

## Project
- [Vitest forks pool](project_vitest-forks-pool.md) — Vitest must use `pool: "forks"` here or the worker hangs on a Vite-server fetch timeout
- [API routes have no P2002 catch](project_api-routes-no-p2002-catch.md) — duplicate inserts return generic 500, not the documented 409; don't trust CLAUDE.md's ae1d74c claim

## Feedback
- [Route-handler mocking](feedback_route-handler-mocking.md) — mock @/lib/auth + @/lib/prisma via vi.hoisted (factories hoist above imports); invoke handlers directly
