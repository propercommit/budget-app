---
name: vitest-forks-pool
description: Vitest must use pool "forks" in this repo's sandboxed env, or the worker hangs on a Vite-server fetch timeout
metadata:
  type: project
---

Vitest in this repo must run with `pool: "forks"` in `vitest.config.ts`.

**Why:** The default worker transport spins up a Vite dev server over loopback. In the sandboxed run environment (project lives on an iCloud Drive path) that network call is blocked, so every run hangs ~130s then fails with `[vitest-worker]: Timeout calling "fetch" with "["/@vite/env","ssr"]"` and reports "no tests". The forks pool runs tests in child processes with no dev server and sidesteps it.

**How to apply:** Keep `pool: "forks"` in the Vitest config for any future test PR. If a fresh config is ever generated, add it before running `pnpm test`, or the first run will appear to hang. Versions when set up: vitest 3.2.6, Vite 7, `@vitejs/plugin-react@5` (v6 wants Vite 8 — peer mismatch).
