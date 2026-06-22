# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm 10** (enforced via `packageManager` in `package.json`).

```bash
pnpm dev          # Next dev server on :3000
pnpm build        # prisma generate && next build
pnpm lint         # ESLint (eslint.config.mjs, next/core-web-vitals base)

pnpm prisma migrate dev --name <name>   # Create + apply a migration locally
pnpm prisma migrate deploy              # Apply pending migrations (used in CI / Vercel)
pnpm prisma generate                    # Regenerate client (also runs on postinstall + build)
```

There is **no test suite** in this repo.

## Environment

Required env vars (see README for details):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client
- `DATABASE_URL` — Prisma runtime (pooled connection)
- `DIRECT_URL` — Prisma migrations (direct connection, not pooler)
- `SUPABASE_JWT_PUBLIC_KEY` — JWK JSON used by `lib/auth.ts` to locally verify Supabase JWTs (ES256)
- Upstash Redis credentials — used for the JWT blocklist (`lib/redis.ts`)

## Git

the feature developped are developped on their own branch (ex: feature/login-button), then are merged onto dev then onto staging then when it has been tested they are merged onto main

## Architecture

### Stack
Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind 4 + Radix UI. Data layer is Prisma 6 against Supabase Postgres. Auth is Supabase (email/password + Google OAuth).

### Auth — two different paths, do not confuse them

There are **two `getAuthenticatedUser` functions** with different purposes:

1. **`lib/auth.ts`** — Local JWT verification path. Reads the Supabase access token from cookies, verifies it with `jose` against `SUPABASE_JWT_PUBLIC_KEY` (ES256), and checks a Redis blocklist (`blocklist:<jti>`). Returns `{ id, email }`. **This is what API routes and `app/page.tsx` use** — it avoids a network round trip to Supabase on every request.
2. **`lib/supabase-server.ts`** — Calls `supabase.auth.getUser()` (hits Supabase). Used in less hot paths.

When adding a new authenticated API route, import from `@/lib/auth`, not `@/lib/supabase-server`.

### Routing & route protection — `proxy.ts`, not `middleware.ts`

Next.js 16 renamed middleware to **proxy**. The file at the repo root is `proxy.ts` (exports a `proxy` function and `config.matcher`). It runs Supabase SSR to read the session, redirects unauthenticated users to `/login`, and bounces signed-in users away from auth pages. Don't rename it to `middleware.ts` — Next 16 expects `proxy.ts`. The README still says "middleware.ts"; that doc is stale.

### Data model (Prisma)

`User` owns `Category[]`, `SpendingItem[]`, `IncomeSource[]`, `UserSettings`. `SpendingItem` owns `SpendingEntry[]`. All children cascade-delete with the user.

Key constraints:
- `Category` has `@@unique([userId, label])` — duplicate category names per user surface a P2002, handled in the API to return a friendly error (see commit `ae1d74c`).
- `SpendingItem` has `@@unique([userId, name, month])`.
- `month` is a `String` in the form `"YYYY-MM"` (e.g. `"2026-06"`). Sorting and "current month" comparisons rely on this format being lexicographically ordered — keep the zero-padding.
- `SpendingItem.spent` exists in the schema but the UI **always recomputes `spent` from `spendingEntries`** (see `app/page.tsx:98`). Treat the column as legacy; don't drive UI off it.

### Server → client data flow

`app/page.tsx` is the single server entry point. It:
1. Authenticates via `lib/auth.ts`.
2. Loads spending items for the last 12 months, all categories, current-month income, and income across all loaded months — in parallel.
3. Maps Prisma records into the plain shapes in `lib/types.ts` (dates → `YYYY-MM-DD` strings, `spent` recomputed from entries).
4. Hands everything to `<Dashboard>` as `initialX` props.

`<Dashboard>` is a `"use client"` component that hydrates three hooks — `useCategories`, `useSpending`, `useIncome` (in `components/hooks/`). These hooks own all mutations and do **optimistic updates**: they patch local state with a `temp-<uuid>` id, call `lib/api.ts`, then replace with the server response on success or roll back on failure (with a `react-hot-toast` error). When changing mutation flows, preserve this pattern.

`lib/api.ts` is the **only** place that talks to `/api/*` from the client. It still sends an `x-user-id: "temp-user"` header — that header is **ignored** server-side (auth comes from the cookie); it's vestigial.

### API routes

Live under `app/api/{categories,spending,income,entries,settings,account}/`. Conventions:
- Always call `await getAuthenticatedUser()` from `@/lib/auth` first; return `401` if null.
- POST handlers `upsert` the `User` row before creating children — Supabase creates the auth user, but the app's `User` table is populated lazily on first write.
- Validate inputs explicitly (hex color regex, required strings, etc.); return 400 with `{ error }` on failure.
- Catch Prisma `P2002` (unique violation) and translate to a user-readable 409 rather than generic 500 (see categories route).

### Component organization

Most feature cards follow a `<Feature>Card` → `<Feature>CardCollapsed` / `<Feature>CardExpanded` split, with modal "popins" under `components/<feature>/popins/`. Modals use React portals (see README "Design Principles") because nested CSS `transform`s would otherwise break `position: fixed`. The shared primitive is `components/ui/` (shadcn-style Radix wrappers).

### Settings / theming

`lib/settings-context.tsx` provides currency, date format, and dark mode via React context, wrapping the app in `app/layout.tsx`. Persisted to `UserSettings` via `/api/settings`. Read settings via the context hook; don't refetch.

## Conventions

- Path alias: `@/` → repo root (see `tsconfig.json`).
- Dates: store as `Date` in Prisma, transport as `YYYY-MM-DD` strings to the client.
- Money: stored as `Float` (not Decimal) — be aware of float math when summing.
- Apple HIG colors used throughout: `#007AFF` (blue), `#34C759` (green), `#FF3B30` (red).
- Mobile-first; assume thumb-zone layouts then adapt up.

