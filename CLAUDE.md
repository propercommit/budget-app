# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm 10** (pinned to exact `pnpm@10.25.0` with an integrity hash via `packageManager` in `package.json`).

```bash
pnpm dev          # Next dev server on :3000
pnpm build        # prisma generate && next build
pnpm lint         # ESLint (eslint.config.mjs, next/core-web-vitals + next/typescript)

pnpm test         # Vitest run (one-shot)
pnpm test:watch   # Vitest watch mode

pnpm prisma migrate dev --name <name>   # Create + apply a migration locally
pnpm prisma migrate deploy              # Apply pending migrations (CI / Vercel)
pnpm prisma generate                    # Regenerate client (also runs on postinstall + build)
```

- `pnpm lint` runs bare `eslint` (no path arg). `@typescript-eslint/no-unused-vars` is set to **error**, so an unused import/var fails lint, not just warns.
- `pnpm build` runs `prisma generate` first; the Prisma client is also regenerated on `postinstall`, so it refreshes on every install and build.
- `pnpm-workspace.yaml` exists only to whitelist `ignoredBuiltDependencies` (`@prisma/client`, `@prisma/engines`, `prisma`, `sharp`, `unrs-resolver`). pnpm 10 blocks these packages' own postinstall scripts, which is **why `prisma generate` is wired explicitly into the `postinstall`/`build` scripts** — bypassing those scripts leaves a stale client.
- `next.config.ts` is the empty default (no custom image domains, redirects, etc.).
- `tsconfig.json`'s `include` array has stray/leftover entries appended after the normal globs (e.g. `components/account/page.old`, a specific popin file). Don't propagate these when editing it.

## Testing

There **is** a test suite: **Vitest 3**, 23 test files colocated in `__tests__/` dirs across `lib/`, `components/`, `components/hooks/`, `app/api/**`, `app/auth/callback`, and `app/login`.

Config: `vitest.config.ts`, global setup: `vitest.setup.ts`.

Load-bearing config you must not change:
- **`pool: "forks"` is mandatory.** The default worker transport opens a Vite dev server over loopback, which is blocked in this sandboxed/iCloud-path environment; without forks, runs hang ~130s then fail with a worker fetch timeout and report "no tests".
- **Default environment is `node`.** Component/hook tests opt into jsdom per file with `// @vitest-environment jsdom` as the **literal first line** (a docblock). Lower or missing → `document`/`window` are undefined.
- **`vitest.setup.ts` deletes `globalThis.MessageChannel`.** React 19's scheduler prefers `MessageChannel`, but jsdom's never delivers, so any `render`/`renderHook` hangs forever without this. It also registers `@testing-library/jest-dom/vitest` matchers. Do not remove either.
- `globals: true` and the `@/` alias works in tests via `vite-tsconfig-paths`; `@vitejs/plugin-react` powers jsdom component tests.

Mock patterns (match these):
- **API route tests** mock `@/lib/prisma` and `@/lib/auth` (`getAuthenticatedUser`) inside a `vi.hoisted()` block — `vi.mock` factories hoist above imports, so module-scope consts throw "Cannot access before initialization". The `prismaMock` is a hand-rolled object of model factories returning `vi.fn()`s, built inline in the hoisted callback. Handlers are imported and called directly (`await POST(req)`). Shared fixtures live in `app/api/__tests__/helpers.ts` (`FAKE_USER`, `jsonRequest`, `getRequest`, `routeContext(id)` which wraps params as `Promise.resolve({id})` for Next 16, `readJson` which handles 204).
- **Testing P2002→409** requires a real `new PrismaClientKnownRequestError(msg, {code:'P2002', clientVersion:'6'})` from `@prisma/client/runtime/library`; the route uses an `instanceof` check that a plain error with a `code` property fails.
- **Hook tests** mock `@/lib/api` and `react-hot-toast` (as `{ default: { error: vi.fn(), success: vi.fn() } }` — it's the default export), use `renderHook`/`act`/`waitFor`, and assert the optimistic + rollback contract.
- Per-file jsdom stubs kept out of shared setup: a no-op `ResizeObserver` for Radix size-hook components (e.g. Checkbox — but not all Radix needs it), and replacing `window.location` to assert navigation. See `.claude/agent-memory/test-writer/feedback_component-test-jsdom-gotchas.md`.

Coverage: all `app/api` routes, the OAuth callback open-redirect guard, the login page, the optimistic hooks, and several `lib`/component units are well covered. **Not** covered (all mocked away): `lib/auth.ts` JWT verification, `lib/redis.ts`, `proxy.ts`, and Prisma at the DB level.

## CI / CD

- `.github/workflows/ci.yml` triggers **only on pull requests targeting `main`**. It runs on Node 20 with pnpm cache, `pnpm install --frozen-lockfile`, then `pnpm test` — **nothing else** (no lint, no build, no prisma).
  - CI green does **not** mean lint or build passed. Run `pnpm lint` and `pnpm build` locally before merging.
  - Because CI is scoped to PRs into `main`, merges into `dev`/`staging` are **unguarded** — tests do not run automatically on the way there.
  - `--frozen-lockfile` means lockfile drift fails CI; commit `pnpm-lock.yaml` changes.
- `.github/workflows/keep-alive.yml` is an **empty 0-byte file** despite its commit message. There is no active scheduled job keeping Supabase awake; the free-tier pause protection is not in effect.

## Environment

Env keys actually present (`.env`):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client
- `SUPABASE_SERVICE_ROLE_KEY` — the only service-role key present in `.env`. ⚠️ **But the code** (`app/api/account/delete/route.ts` and `prisma/seed-demo.ts`) reads `process.env.SUPABASE_SERVICE_ROLE` (no `_KEY`), which is **not** in `.env` — so the admin client is built with an undefined key and Supabase admin calls (auth-user delete, demo seed) fail until you either add a `SUPABASE_SERVICE_ROLE` var or change the code to read `SUPABASE_SERVICE_ROLE_KEY`.
- `DATABASE_URL` — Prisma runtime (pooled connection)
- `DIRECT_URL` — Prisma migrations (direct connection, not pooler)
- `SUPABASE_JWT_PUBLIC_KEY` — ES256 JWK JSON used by `lib/auth.ts` to locally verify Supabase JWTs
- `REDIS_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis. Backs live token revocation: the `revoked-before` epoch (password reset) and `recovery-session` containment. `getAuthenticatedUser` reads it on every request, so the app hard-depends on Redis for auth. (The separate `blockToken` blocklist is inert — see Auth notes.)
- `SITE_PASSWORD`

The README documents only a few of these and is stale on env vars — trust this list.

## Git

Features are developed on their own branch (e.g. `feature/login-button`), then merged into `dev`, then `staging`, and finally — once tested — into `main`. (Note: CI only guards PRs into `main`.)

## Architecture

### Stack
Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind 4 + Radix UI. Data layer is Prisma 6 against Supabase Postgres. Auth is Supabase (email/password + Google OAuth).

### Auth — two different paths, do not confuse them

There are **two `getAuthenticatedUser` functions** with different return shapes — importing from the wrong module silently changes the result:

1. **`lib/auth.ts`** — Local JWT verification. Reads the Supabase access token from cookies (builds a server client whose `setAll` is a no-op, calls `getSession()` purely to extract the cookie token — **no network round trip**), verifies it with `jose` against `SUPABASE_JWT_PUBLIC_KEY` (ES256). Returns `{ id, email }`. **This is what API routes and `app/page.tsx` use.** The public key is imported once and cached at module scope; on a JWS signature failure (e.g. signing-key rotation) the cache is cleared so the next request re-imports it. Token expiry returns `null` with **no refresh attempt** — refresh only happens via the Supabase client in `proxy.ts`/the browser, so a just-expired token yields 401 until the client refreshes.
2. **`lib/supabase-server.ts`** — exports `createServerSupabaseClient`, used **only** by the OAuth callback (`app/auth/callback`) and email-confirm (`app/auth/confirm`) handlers, which need cookie-writing clients for `exchangeCodeForSession`/`verifyOtp`. It also exports a `getAuthenticatedUser` that calls `supabase.auth.getUser()` (network) and returns a Supabase `User` — but that function currently has **no callers (dead code)**.

When adding a new authenticated API route, import from `@/lib/auth`, not `@/lib/supabase-server`.

**There are TWO Redis revocation mechanisms in `lib/auth.ts`; some are live, one is inert — don't confuse them.**

1. **`revoked-before:<userId>` epoch — LIVE.** `revokeUserSessions(userId)` stamps a per-user "revoked before" timestamp; `getAuthenticatedUser` rejects any token whose `iat` predates it (signature-valid or not, unexpired or not). It is **called by the password-reset flow** (`app/api/auth/reset-password`), so completing a reset evicts every previously-issued token (including a stolen one) immediately. A fresh post-reset sign-in mints a newer `iat`, so the legitimate user is unaffected.
2. **`recovery-session:<session_id>` containment — LIVE.** `markRecoverySession(session_id)` (called by `/auth/confirm` on a recovery `verifyOtp`) flags the recovery session; `getAuthenticatedUser` then refuses to treat that session as a normal login. This contains the recovery session **server-side, by session id** — so dropping the `pw_recovery` cookie doesn't let it roam (the reset endpoints bypass `getAuthenticatedUser`, so they still work). Scoped per-session, so other devices / future logins are unaffected.
3. **`blocklist:<session_id>` per-session blocklist — INERT.** `blockToken()` is the only writer and **has no callers**, so no `blocklist:*` entries are ever created and `isTokenBlocked()` always returns false. Logout (`app/account/page.tsx`) only calls `supabase.auth.signOut()`, and **account deletion does NOT revoke** — so after deletion a stolen/active token stays valid until natural expiry (account deletion should call `revokeUserSessions`). If you wire `blockToken` up, note its key is the JWT **`session_id`** claim despite the misleadingly named `jti` local var.

All three reads fail **closed** (a Redis throw is caught and yields `null`).

### Routing & route protection — `proxy.ts`, not `middleware.ts`

Next.js 16 renamed middleware to **proxy**. The root file is `proxy.ts` (exports `proxy` + `config.matcher`). Don't rename it to `middleware.ts`. (Its console logs are still prefixed `[Middleware]` — legacy.)

- `PUBLIC_ROUTES = ['/login', '/auth']` are open; everything else redirects unauthenticated users to `/login?redirect=<pathname>`. Matching uses `startsWith`, so any path beginning with `/login` or `/auth` is public.
- `AUTH_ROUTES` contains **only `/login`** — authenticated users are bounced off the login page (to the `?redirect` target or `/`), but `/auth/callback` and `/auth/confirm` stay reachable while signed in (required for them to work).
- `proxy.ts` calls `supabase.auth.getUser()` (**a network call to Supabase on every matched navigation**) and **fails open** — on any thrown error it logs and lets the request through. It is therefore not a hard security boundary; the real gate is `lib/auth.ts` in API routes.

**Auth flow contracts to preserve:**
- Deep-link redirect: `proxy.ts` writes `?redirect=<pathname>` → login page (`app/login/page.tsx`) forwards it as `?next` to `/auth/callback` → the callback consumes it. Break any link and users land on `/`.
- Open-redirect guard: `app/auth/callback`'s `safeNext()` only honors same-origin paths (start with `/`, not `//`); anything else falls back to `/`. Keep this when adding post-login redirects.
- Callback failures redirect to `/login?error=<code>` (`auth_failed`, `no_code`, or the raw OAuth error); the login page maps codes to toasts and strips the param via `history.replaceState`.
- `app/auth/confirm` handles email confirm/change via `verifyOtp` and always redirects to `/account` (never a caller-supplied path).
- Email/password sign-in does a full-page navigation (`window.location.href = '/'`) so the SSR session cookie is picked up. **Sign-up does NOT log the user in** — it shows "Check your email". Code expecting a session right after `signUp()` will break.

### Data model (Prisma)

`User` owns `Category[]`, `SpendingItem[]`, `IncomeSource[]`, `UserSettings`. `SpendingItem` owns `SpendingEntry[]`. Real Postgres FK constraints (default `relationMode = foreignKeys`) enforce all cascades in the DB.

- **`User.id` is the Supabase auth UID (a uuid), not a cuid.** The `@default(cuid())` is effectively dead — the seed and API routes set `id` to the auth uid and upsert on it. ID defaults are mixed across tables (most `cuid()`, `UserSettings` uses `uuid()`); don't assume a uniform id format.
- **Deleting a `Category` is a hidden mass-delete.** `SpendingItem.categoryId` is `onDelete: Cascade`, so removing one category wipes every `SpendingItem` in that category across **all** months plus their `SpendingEntry`s. There is no per-month scoping at the DB level.
- `Category` has `@@unique([userId, label])` — duplicates surface a P2002, translated to a friendly 409 in the categories API.
- `SpendingItem` has `@@unique([userId, name, month])`. **`IncomeSource` has the same `month` String convention but NO unique constraint** — income duplicates are allowed.
- `month` is a `String` `"YYYY-MM"` (e.g. `"2026-06"`) on both `SpendingItem` and `IncomeSource`. There is **no DB-level format check** — writing unpadded `"2026-6"` silently breaks lexicographic sort and the unique dedup. Keep zero-padding; "current month" and range comparisons depend on it.
- Performance indexes back the 12-month dashboard load: `Category(userId)`, `SpendingItem(userId)` and `(userId, month)`, `IncomeSource(userId)` and `(userId, month)`, `SpendingEntry(spendingItemId)`. These stay effective only while `month` is lexicographically sortable `YYYY-MM`.
- **`SpendingItem.spent` is a stored, denormalized Float that is actively written but may be stale.** The entries endpoints recompute and persist it from the sum of entries (POST/DELETE always; PUT when amount changes); spending POST/PUT also accept a raw client `spent`. The seed sets `spent` independently of entries, so raw DB rows can have `spent ≠ sum(entries)`. **Recompute from `spendingEntries` on read; never trust the stored value.** Two write paths (entries vs spending POST/PUT) can desync it — the entries recompute always overwrites.
- Migrations: 5 in `prisma/migrations/`, latest `20260309165818_add_performance_indexes`. `migration_lock.toml` pins `postgresql`. Migrations run against `DIRECT_URL` (non-pooled); runtime uses `DATABASE_URL` (pooled). The `20260219155824` migration added `IncomeSource.month` as NOT NULL with no default — it only worked because the table was empty.
- `lib/prisma.ts` forces the datasource url to `process.env.DATABASE_URL` and caches the client on `globalThis` only when `NODE_ENV !== 'production'` (to survive dev hot-reload).

**Demo seed (`prisma/seed-demo.ts`):** NOT wired into `package.json` (no `prisma.seed` key / script) — run manually (e.g. via `tsx`). It creates/finds Supabase auth user `demo@budgetapp.ch / demo1234` via the admin API, **destructively deletes all existing data for that user**, then reseeds 8 categories, 3 months of income/spending/entries, and a CHF settings row. It reads `process.env.SUPABASE_SERVICE_ROLE` but its error message tells you to set `SUPABASE_SERVICE_ROLE_KEY` — set the var named **`SUPABASE_SERVICE_ROLE`** or it silently reads the wrong key. Requires `NEXT_PUBLIC_SUPABASE_URL` too.

### Server → client data flow

`app/page.tsx` is the single server entry point. It is an **ISR page (`export const revalidate = 30`)** — a full reload after a mutation can show up to 30s-stale Prisma data despite optimistic client state. It:
1. Authenticates via `lib/auth.ts`.
2. Loads data: **`spendingItems` is awaited first** (its result derives `spendingMonths`), then categories + current-month income + cross-month income run in `Promise.all`. Cross-month income (`allIncomeSources`, drives trends) is scoped to **months that have spending items** (`month: { in: spendingMonths }`) — a month with income but no spending item is omitted from trends after the initial load.
3. Maps Prisma records into `lib/types.ts` shapes. **Date handling is inconsistent:** `SpendingItem`/`SpendingEntry` dates become `YYYY-MM-DD` strings, but `IncomeSource.startDate`/`endDate` are passed through as **`Date` objects** (typed `Date` in `lib/types.ts`). Code that treats all transported dates as strings (`.split('T')`) breaks on income; Dashboard wraps income dates in `new Date(...)` before formatting. `spent` is recomputed from entries **only here, at load**.
4. Hands everything to `<Dashboard>` as `initialX` props.

`<Dashboard>` is `"use client"` and hydrates three hooks — `useCategories`, `useSpending`, `useIncome` (`components/hooks/`). These do **optimistic updates**: patch local state with a `temp-<uuid>` id (`crypto.randomUUID()`), call `lib/api.ts`, then replace with the server response on success or roll back with a `react-hot-toast` error on failure. **Preserve this pattern when changing mutation flows**, but note the exceptions and quirks:
- **`copySpendingToMonth` and `useIncome.loadMonth` are NOT optimistic** — they create records then `setState`, swallowing errors to `console` (no toast, no rollback). A failed month-copy leaves the UI looking empty with no feedback.
- **Switching months auto-mutates the backend:** an empty new month gets the previous month's spending items copied in (`copySpendingToMonth`) and the current month's income sources copied in (`loadMonth`). Navigating months is not read-only.
- `useSpending` maintains `spent` **incrementally** client-side (`s.spent ± amount`) rather than recomputing from entries — Float drift is possible mid-session until a reload re-derives it.
- `updateSpending` is the odd one out: the **caller** (Dashboard) builds the full optimistic item and passes it as `optimisticItem`; other update fns build it internally.
- `createIncome`/`updateIncome` re-fetch all income (`getAllIncomeSources`) after success to keep the trends dataset in sync; `deleteIncome` only filters locally.
- All hooks are dual-mode (accept initial data, else fetch on mount). Dashboard always passes initial props, so the fetch fallback and `isLoading` branch are effectively dead in production.

`lib/api.ts` is the **only** place that talks to `/api/*` from the client. The `x-user-id: "temp-user"` header is ignored server-side (auth is the cookie) — vestigial. **The income API is non-RESTful:** PUT/DELETE go to `/api/income` with the `id` in the JSON body, unlike categories/spending/entries which use `/api/<resource>/<id>`.

Layout providers (`app/layout.tsx`): `SettingsProvider` wraps children; `react-hot-toast` `<Toaster/>`, Vercel `<Analytics/>` and `<SpeedInsights/>` sit at body level outside the provider.

### API routes

Live under `app/api/{categories,spending,income,entries,settings,account}/`. Conventions and the many exceptions:
- Always call `await getAuthenticatedUser()` from `@/lib/auth` first; return `401` if null. (The income route returns the misspelled `"Unauthorised"`; everything else uses `"Unauthorized"`.)
- **Lazy `User` upsert happens ONLY in the categories POST.** Spending/income/entries POSTs do not upsert and assume the `User` row exists. Spending/entries are safe because they require a pre-existing category (whose creation upserted the user), but **income POST has no such guard** — if income is a brand-new user's first-ever write, `incomeSource.create` can hit a FK error.
- **Prisma error translation is not universal:** P2002→409 is only in categories POST and spending POST; income translates P2025→404 (id from body); settings/entries/account and all `[id]` update/delete handlers do no specific translation and fall through to generic 500.
- `month` for a `SpendingItem` is always **derived server-side from `startDate`** (`YYYY-MM`); a client-supplied `month` is ignored. Income POST is the opposite — it takes `month` from the client body (required) and passes `startDate`/`endDate`/`note` through as raw strings (no `Date` conversion).
- Ownership patterns differ: categories/spending/entries pre-fetch (`findFirst`/`findUnique`) and return **404 on miss or non-ownership** (entries check via `spendingItem.userId` — entries have no own `userId`; 404 not 403 is intentional, to avoid leaking existence). Income scopes via `where: { id, userId }` and relies on P2025→404.
- GET `/api/spending` returns items **grouped into an object keyed by month** (`{ "YYYY-MM": [...] }`) and renames the Prisma relation `spendingEntries`→`entries` in all spending responses (the client expects `entries`).
- Settings: GET auto-creates a `UserSettings` row with `DEFAULT_SETTINGS` if missing; PUT uses `upsert` so it self-heals. Currency/dateFormat validated against `VALID_CURRENCIES`/`VALID_DATE_FORMATS` in `@/lib/constants`.
- **Account deletion** (`app/api/account/delete/route.ts`) does NOT rely on cascade — it manually `deleteMany`s entries→items→categories→income, then the `User` row, then calls Supabase **admin** `deleteUser` (service-role client from `SUPABASE_SERVICE_ROLE`, a different env var than the anon key). A failed Supabase auth-delete is only logged — the route still returns `{success:true}`. It does **not** revoke outstanding JWTs (no blocklist write), so the deleted user's token works until expiry.
- Validation magic numbers are copy-pasted per file, not shared (`MAX_NAME_LENGTH=100`, etc.). **Income uses a different amount cap (1e12) vs 1e8 elsewhere** — the same amount can be valid in one route and rejected in another.

### Components, theming & shared libs

- **Two modal systems, use the right one.** Feature popins (spending, category, income, entries) wrap the bespoke **`PopinWrapper`** (`components/ui/popin-wrapper.tsx`) — a `fixed inset-0 z-50` overlay (not Radix, hardcoded light colors, bottom-sheet on mobile). The shadcn Radix `Dialog` (`components/ui/dialog.tsx`) is used **only** by the account modals (logout/email/password/delete). For a new feature popin, use `PopinWrapper`.
- **`PopinWrapper` does NOT portal** — it renders inline. The `createPortal(..., document.body)` trick is applied a level up in **`SpendingCard`**, to lift its nested popins out of the horizontally-scrolling carousel so `position: fixed` isn't clipped by `overflow`/`transform` (`ReceiptViewer` in `components/ui/receipt-viewer.tsx` also self-portals its own full-screen overlay — so SpendingCard isn't the only portal). Dashboard-level popins render inline at the page root (no transformed ancestor). Placing a `PopinWrapper` popin inside any `overflow`/scroll/`transform` container without a portal will clip it.
- **Popin remount-via-key:** `PopinWrapper` obeys only the `isOpen` prop (`return null` when closed) — it stays mounted otherwise. To reset a "create" form between opens, callers force a remount with a changing React `key` (often an incrementing counter in Dashboard). Forgetting this leaves stale state.
- **Charts are hand-rolled inline SVG** (`components/area-line-chart.tsx` and friends) with CSS keyframe animations and horizontal scroll past 6 points. **`recharts` is installed but never imported** — don't reach for it; extend the SVG components.
- **Dark mode is currently a visual no-op.** `lib/settings-context.tsx` toggles/persists/rolls back a `darkMode` boolean, but nothing applies a `dark` class to the DOM, and cards/popins use hardcoded light hex colors (`#1D1D1F`, `bg-white`, etc.) rather than theme tokens (only the mostly-unused `ui/dialog` uses semantic tokens). Implementing dark mode needs both a DOM class toggle and migrating inline hex to tokens.
- `lib/settings-context.tsx` does optimistic update + rollback (toast) on every setter; consumers must read via `useSettings()` (throws outside the provider). Three date formatters keyed on the user's `dateFormat` (`formatDate`, `formatDateShort`, `formatDateFull`; tokens in `lib/constants.ts`) — but both Dashboard and MonthPicker **bypass them**: Dashboard hardcodes `toLocaleDateString("en-US", {month:"short"})` for chart axis labels, and MonthPicker hardcodes `toLocaleDateString("en-US", {month:"long", year:"numeric"})` for its picker label.
- `formatAmount` (`lib/utils.ts`): abbreviates ≥10K→K, ≥1M→M, ≥1B→B, ≥1T→T (`.toFixed(1)`), else `toLocaleString()`. **Currency symbol is a suffix with a leading space** (`"1,234 $"`, `"12.0K €"`) — not a locale-aware currency formatter; expect rounding surprises on summed Floats.
- `iconMap` (`lib/icon-map.tsx`): string id → pre-sized lucide node; render pattern is `iconMap[id] || rawString` (unknown id renders its raw string). `availableIcons` (what `IconPicker` shows) is a curated **subset** of `iconMap` keys — adding to one doesn't add to the other.
- Two `Category` types: minimal `{icon?, label, color}` in `lib/category.tsx` (used by budget-overview) vs the full Prisma-backed one in `lib/types.ts` (everywhere else). Card components take their own local `{name, icon, color}` shape, so Dashboard maps `c.label → name` at every call site.
- `filterActiveCategories` (`lib/filter-active-categories.ts`): lexicographic compare of `startDate.slice(0,7)`/`endDate.slice(0,7)` vs the `YYYY-MM` month; `endDate null` = open-ended. Breaks if dates aren't zero-padded `YYYY-MM-DD` strings.
- Receipt images are compressed client-side via `browser-image-compression` before upload (`lib/compress-image.ts`: maxSizeMB 1, maxWidthOrHeight 1920). `ReceiptViewer` always downloads as `receipt.jpg` regardless of source type.
- `StickyBudgetBar` visibility is driven by a scroll listener that `querySelector`s `[data-spending-section]` and `[data-budget-overview]` — the bar never appears if those attributes are missing/renamed.
- `components/header.tsx` makes its **own** `supabase.auth.getUser()` network call on mount, separate from the server-side JWT auth — it is not wired to `app/page.tsx`'s auth and shows a spinner / `"Account"` fallback independently.

## Conventions

- Path alias: `@/` → repo root (see `tsconfig.json`).
- Dates: store as `Date` in Prisma. Convention is `YYYY-MM-DD` strings to the client — **but income dates are an exception** (transported as `Date`; see data-flow above).
- Money: stored as `Float` (not Decimal) — be aware of float math when summing, and of mid-session `spent` drift.
- Apple HIG colors used throughout: `#007AFF` (blue), `#34C759` (green), `#FF3B30` (red).
- Mobile-first; assume thumb-zone layouts then adapt up.

## Code rules (binding — apply to ALL code produced by any agent or subagent)

- **No truthy/falsy-vulnerable tests.** Assertions and conditionals must check the exact thing they mean. Don't lean on the truthiness of a value where `0`, `""`, `NaN`, `false`, or `null` vs `undefined` would change the outcome. In tests use explicit assertions (`toBe(0)`, `toEqual([])`, `toBeNull()`, `toBeDefined()`, `.toHaveLength(n)`) rather than `expect(x).toBeTruthy()`/`toBeFalsy()`; in code use `x === undefined`, `x == null`, `Number.isNaN(x)`, `arr.length === 0`, etc. instead of bare `if (x)` when `x` can legitimately be a falsy value.
- **Everything is typed; `any` is banned.** Never introduce the `any` type (explicit or implicit). If a type is genuinely unknowable at a boundary (truly external/untrusted data — network responses, `JSON.parse`, third-party payloads), use `unknown`, and narrow it to a concrete type as early as possible (validation/parsing/type guard) before it flows further into the code. `unknown` is a temporary state at the edge, never a resting type passed around. Prefer explicit type annotations and discriminated unions over loose objects.
- **Clean indentation & formatting.** Consistent indentation matching the surrounding file; no mixed tabs/spaces, no ragged blocks, no leftover dead code or stray whitespace.
- **JSDoc following best practices.** Document exported functions, types, hooks, and non-obvious logic with JSDoc that explains intent, contracts, parameters/returns that aren't self-evident, edge cases, and gotchas. Do NOT write JSDoc that merely restates the code or the obvious (e.g. `/** Gets the name */ getName()`). If a comment adds no information beyond the signature, omit it.
