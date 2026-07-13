# Security Audit — budget-app

**Scope:** Full blue-team review of the Next.js 16 / React 19 / Prisma 6 / Supabase budgeting webapp at `/Users/propercommit/Documents/personal-projects/budget-app`.
**Date:** 2026-07-13
**Reviewer:** Senior security engineer (authorized, owner-requested review)
**Method:** Manual source review of every API route (both methods), the two auth paths, `proxy.ts`, the OAuth/recovery flows, upload paths, output rendering, and config; plus `pnpm audit`, git-history secret scan, and data-flow tracing from each entry point to its sink.

## Summary of findings

| Sev | ID | Title |
|-----|----|-------|
| High | H1 | Known-vulnerable Next.js (16.1.4) — network-exposed DoS advisories |
| Medium | INFRA-1 | Avatar Storage policies not owner-scoped — any user can list/overwrite/delete any avatar (supersedes M2) |
| Medium | M1 | No HTTP security headers (CSP, X-Frame-Options, HSTS) — `next.config.ts` is empty |
| Medium | M2 | Avatar upload is entirely client-driven — *resolved & sharpened by live check: see INFRA-1/INFRA-3* |
| Low | INFRA-2 | Row Level Security disabled on all `public` tables (latent; currently blocked by absent grants) |
| Low | INFRA-4 | Supabase Auth leaked-password (HIBP) protection disabled |
| Low | L1 | `proxy.ts` route guard fails open on error |
| Low | L2 | Local JWT verification omits `aud` / `iss` claim checks |
| Low | L3 | No CSRF token / Origin check on state-changing API routes (relies on cookie SameSite) |
| Low | L4 | CSV formula injection in the data export |
| Low | L5 | Sign-up / email-change surface raw provider error messages (account enumeration) |
| Low | L6 | No app-level rate limiting on `materialize` and other mutating endpoints |
| Low | L7 | Recovery-token HMAC secret falls back to the Supabase service-role key |
| Low | L8 | Receipts stored as base64 in DB and eagerly loaded into the SSR payload; no aggregate cap |
| Info | I1 | `export const revalidate = 30` on the authenticated dashboard page |

**No Critical findings.** No RCE, no SQL/command/template injection, no cross-user data access (IDOR), and no committed secrets were found. The authorization model, password-reset/recovery design, and account-deletion flow are notably well built (see *Verified non-issues*).

---

## High

### H1 — Known-vulnerable Next.js version (network-exposed DoS)
**Severity:** High · **Category:** dependencies · **Confidence:** confirmed
**Evidence:** `package.json:` `"next": "^16.1.1"`; installed/resolved version **16.1.4** (`node_modules/next/package.json`). Confirmed by `pnpm audit --prod`.

Two advisories apply to 16.1.4, both reachable by an unauthenticated remote client because they live in the request/RSC handling layer that fronts every route:

- **GHSA-h25m-26qc-wcjf** — "HTTP request deserialization can lead to DoS when using insecure React Server Components." Vulnerable `>=16.1.0-canary.0 <16.1.5`; **patched `>=16.1.5`**.
- **GHSA (DoS with Server Components)** — vulnerable `>=16.0.0-beta.0 <16.2.3`; **patched `>=16.2.3`**.

`app/page.tsx` is a Server Component that runs on every authenticated dashboard load, so the RSC request path is squarely in use.

**Exploit scenario:** A remote attacker sends crafted HTTP requests to the deployed app (no auth required, since the framework processes the request before route auth runs), exhausting server resources / worker time and denying service to legitimate users. On Vercel this also translates into function-invocation and cost amplification.

**Remediation:** Upgrade Next.js to **≥ 16.2.3** (clears both advisories): `pnpm add next@latest`, then re-run `pnpm audit --prod` and `pnpm build`. The other 26 `--prod` advisories reported by pnpm are almost all transitive under the Prisma CLI toolchain (`@prisma/client > prisma > @prisma/config > effect / defu / c12`), i.e. build/CLI-time, not request-path — lower priority, but bump `prisma`/`@prisma/client` to the latest 6.x to clear them too.

---

## Medium

### M1 — No HTTP security headers (CSP, X-Frame-Options, HSTS, Referrer-Policy)
**Severity:** Medium · **Category:** configuration · **Confidence:** confirmed
**Evidence:** `next.config.ts:1-7` is the empty default — no `headers()`, no CSP. No middleware-injected headers in `proxy.ts`. No `<meta>` CSP in `app/layout.tsx`.

The app serves authenticated financial data and destructive actions (account deletion, data export, budget mutation) with **no** `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `Strict-Transport-Security`, `Referrer-Policy`, or `X-Content-Type-Options`.

**Exploit scenario:**
- *Clickjacking:* with no frame-ancestors/X-Frame-Options, `https://app` can be framed by an attacker page and UI-redressed to trick a logged-in user into interacting with settings/actions.
- *No XSS containment:* the app renders user-controlled strings (category labels, entry names/notes, income names). React auto-escapes them today (no injection sink found — see L4/verified), but there is zero second line of defense: any future `dangerouslySetInnerHTML` or a dependency-introduced sink would execute with no CSP to blunt it, and could exfiltrate the Supabase session/tokens.
- *No HSTS:* leaves a downgrade window on first visit.

**Remediation:** Add a `headers()` block in `next.config.ts` (or set them in `proxy.ts`) with, at minimum: a restrictive `Content-Security-Policy` (start with `default-src 'self'`, allow only the Supabase/Upstash origins actually needed, avoid `unsafe-inline` for scripts), `X-Frame-Options: DENY` (or `frame-ancestors 'none'` in CSP), `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff`.

### M2 — Avatar upload is entirely client-driven; security depends on unseen Storage bucket RLS
**Severity:** Medium · **Category:** unsafe_data_handling / broken_access_control · **Confidence:** tentative (depends on Supabase bucket config not present in the repo)
**Evidence:** `app/account/page.tsx:217-254` (`handleAvatarUpload`) and `lib/avatar-storage.ts:16-18` (`avatarFilePath`).

The upload goes **directly from the browser** to Supabase Storage using the anon client + user session:
```
supabase.storage.from(AVATARS_BUCKET).upload(filePath, file, { upsert: true })
```
The object key `filePath` is `avatars/<userId>-<timestamp>.<ext>` and is **fully controlled by client code**. Consequences:

1. **No server-side control at all.** The only enforcement is the bucket's RLS policies, which are configured in the Supabase dashboard and are **not visible in this repo**. If the bucket policy is the common-but-permissive "any authenticated user can insert/update in this bucket," then:
   - `upsert: true` + attacker-chosen path lets one user **overwrite another user's avatar** (needs the victim's UID, a UUID — not secret; UIDs can leak via other surfaces).
   - A user can upload **arbitrary content/paths** to a public bucket. If the bucket is public-read and serves user objects with an attacker-influenced `Content-Type` (e.g. `text/html`), that is stored content hosted on the Storage origin.
2. **Client-side type/size checks are not a control.** `ProfileAvatar` (`profile-avatar.tsx:37-56`) validates MIME/size in the browser only; a direct API/curl call to Storage bypasses it entirely.
3. The resulting public URL is written into `user_metadata.avatar_url` (`account/page.tsx:238-240`) and later rendered as an `<img src>` (`profile-avatar.tsx:63`).

**Open question for the owner (drives the real severity):** What are the RLS policies on the `avatars` bucket, is it public-read, and does it constrain the object path to `auth.uid()`? If the policy already pins writes to `name LIKE auth.uid() || '-%'` (or a per-user folder) and the bucket only serves images, this collapses to Low. If writes are broadly allowed, it is a genuine cross-user integrity / content-hosting issue.

**Remediation:** Enforce a Storage RLS policy that ties the object name/prefix to `auth.uid()` (per-user folder is cleanest: `avatars/<uid>/...` with `(storage.foldername(name))[1] = auth.uid()::text`), and either keep the bucket private (serve via signed URLs) or guarantee it only ever serves image content types. Better still, route the upload through a server route handler that re-validates content type/size and derives the path from the server-side `getAuthenticatedUser().id` rather than trusting the client.

---

## Low

### L1 — `proxy.ts` route guard fails open on error
**Severity:** Low · **Category:** broken_access_control · **Confidence:** confirmed
**Evidence:** `proxy.ts:132-137` — the top-level `catch` returns `supabaseResponse` ("allow request to proceed (fail open for better UX)"). `proxy.ts:70` also calls `supabase.auth.getUser()` (a network call to Supabase) whose failure path only logs.

If the Supabase auth call throws (outage, network blip), the middleware lets the request through unauthenticated. This is **not** a data-exposure hole today because the real gate is per-route: `app/page.tsx:13-16` and every `app/api/**` handler independently call `getAuthenticatedUser()` from `@/lib/auth` (local JWT verify) and 401/redirect on null. So a failed-open middleware still lands on a route that re-checks. Reported as defense-in-depth: the middleware advertises protection it will silently drop under failure, which is a footgun if any future route is added that relies on middleware alone.

**Remediation:** Fail closed for non-public routes — on a thrown error, redirect to `/login` rather than serving the request — or document explicitly that middleware is best-effort and per-route auth is the boundary (it currently is). Keep every new page/route calling `getAuthenticatedUser()` directly.

### L2 — Local JWT verification omits `aud` / `iss` validation
**Severity:** Low · **Category:** broken_access_control · **Confidence:** firm
**Evidence:** `lib/auth.ts:118-120` — `jose.jwtVerify(token, publicKey, { algorithms: ["ES256"] })`. Algorithm is correctly confined to ES256 (blocks `alg:none` and HS/ES confusion), and `exp` is enforced by jose. But no `audience` or `issuer` option is passed, and the payload's `aud`/`iss` are never checked.

Impact is limited because the ES256 key is the project's own asymmetric signing key, which signs user session tokens for this project only — so there is no obvious foreign token to confuse it with. Still, pinning `aud`/`iss` is standard hardening and cheap insurance against Supabase issuing other token classes under the same key in future.

**Remediation:** Pass `{ algorithms: ["ES256"], issuer: "<project-ref>.supabase.co/auth/v1", audience: "authenticated" }` to `jwtVerify`.

### L3 — No CSRF token / Origin check on state-changing API routes
**Severity:** Low · **Category:** web_specific · **Confidence:** firm
**Evidence:** All mutating handlers (`app/api/**` POST/PUT/DELETE, `app/api/account/delete`) authenticate purely from the Supabase session cookie via `getAuthenticatedUser()`; none check an anti-CSRF token or the `Origin`/`Referer` header. The vestigial `x-user-id` header is ignored (`lib/api.ts:1`, server never reads it).

Real-world exploitability is **low** because Supabase's `@supabase/ssr` session cookies are `SameSite=Lax` by default, so a cross-site `fetch`/form POST won't carry them, and the JSON `Content-Type` forces a preflight cross-origin anyway. The residual risk: this protection is implicit and external to the app — if the Supabase cookie policy is ever changed to `SameSite=None` (e.g. for an embedding/mobile scenario), **every** state-changing route becomes CSRF-able, including `DELETE /api/account/delete`.

**Remediation:** Add an explicit defense so it doesn't depend on a library default: verify the `Origin` header against an allowlist in `proxy.ts` for non-GET requests to `/api/*`, or adopt Next's built-in Server Actions / a double-submit token. Document the SameSite dependency.

### L4 — CSV formula injection in the data export
**Severity:** Low · **Category:** injection · **Confidence:** confirmed
**Evidence:** `lib/csv.ts:25-34` (`csvField`) does correct RFC-4180 quoting but performs **no formula-injection neutralization**. User-controlled fields flow in unmodified: category labels, series/entry names, notes, income names (`app/api/account/export/route.ts:107-162`).

A user who names a category or note `=HYPERLINK(...)`, `=1+1`, `+...`, `-...`, `@...`, or a cmd/DDE payload gets that verbatim into the CSV. When the export is opened in Excel/Sheets the cell is evaluated as a formula. This is primarily **self-inflicted** (all exported data is the exporter's own input), so it is not a cross-user attack — the risk is a user importing data from elsewhere, or forwarding/sharing the export to a third party who opens it.

**Remediation:** In `csvField`, when a string cell begins with `= + - @` (or tab/CR), prefix it with a single quote `'` or a zero-width guard, and always quote such cells. Keep the existing RFC-4180 quoting.

### L5 — Sign-up and email-change surface raw provider error messages
**Severity:** Low · **Category:** secrets_and_sensitive_data (information disclosure) · **Confidence:** firm
**Evidence:** `app/login/page.tsx:150-151` sets the banner to `error.message` verbatim on sign-up; `app/account/page.tsx:304-306` and `:349-351` surface `error.message` on email/password change. By contrast the **login** path is careful (`login/page.tsx:133-135` returns a generic "Incorrect email or password").

Depending on Supabase's "confirm email" configuration, the raw message can differentiate states ("User already registered", rate-limit text), enabling account enumeration or leaking provider internals to the client.

**Remediation:** Map provider errors to generic, non-enumerating messages on the sign-up and email-change paths, mirroring the login path. For sign-up, always show the neutral "check your email" state.

### L6 — No app-level rate limiting on mutating / auth-adjacent endpoints
**Severity:** Low · **Category:** configuration (abuse) · **Confidence:** firm
**Evidence:** Only `app/api/account/export/route.ts:54-67` implements throttling (a solid Redis `SET NX` 2-day cooldown + success-path delay). No other endpoint has app-level limits.

- `POST /api/spending/materialize` (`materialize/route.ts`) auto-mutates on every month navigation and creates a `SpendingItem` per recurring series. It is bounded to now-and-future months but a valid session can POST it for arbitrarily many distinct future months (`month >= currentMonth`), each creating N rows — unbounded row growth on the caller's own account (storage abuse / self-DoS, and Postgres write amplification).
- Login / password-reset-request rely entirely on Supabase's own rate limits (reasonable, but not app-controlled).

**Remediation:** Add a lightweight Upstash rate limit (you already depend on `@upstash/redis`) to `materialize` and the write routes — e.g. cap materialize calls and/or bound how far into the future a month may be materialized. Confirm Supabase Auth rate limits are enabled in the dashboard.

### L7 — Recovery-token HMAC secret falls back to the Supabase service-role key
**Severity:** Low · **Category:** cryptographic_weaknesses · **Confidence:** confirmed
**Evidence:** `lib/recovery.ts:22-29` — `secret()` returns `RECOVERY_HMAC_SECRET ?? SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_SERVICE_ROLE ?? ""`.

The code comments already flag this as a compromise. Reusing the high-value service-role key as an HMAC signing key couples two trust domains: rotating the service-role key silently invalidates all in-flight recovery tokens (availability), and it violates key separation. The HMAC output does not expose the key, so this is hygiene, not a direct leak. The empty-string fallback fails closed (verification returns false) — good.

**Remediation:** Set a dedicated `RECOVERY_HMAC_SECRET` in the environment (the code already prefers it) so the recovery marker is not tied to the service-role key.

### L8 — Receipts stored as base64 in the DB and eagerly loaded into the SSR payload
**Severity:** Low · **Category:** unsafe_data_handling (resource) · **Confidence:** firm
**Evidence:** Receipts are stored inline as data URLs on `SpendingEntry.receiptUrl`, capped per-entry at ~5MB (`app/api/entries/route.ts:13,166-171`). `app/page.tsx:53-64` selects `receiptUrl: true` for **every** entry in the 12-month window and ships it in the server-rendered payload, with no aggregate per-user cap.

A user accumulating many receipts inflates both the row/DB size and, more importantly, the dashboard's SSR response on **every** load (all in-window receipt blobs re-sent each time). Self-inflicted, but it degrades the app for that user and increases Vercel egress/function time.

**Remediation:** Store receipts in Supabase Storage (like avatars) and keep only a reference in the DB; do not `select` `receiptUrl` in the dashboard query — lazy-load a receipt only when its viewer opens (`ReceiptViewer`). Add a per-user aggregate cap.

---

## Info

### I1 — `export const revalidate = 30` on the authenticated dashboard
**Severity:** Info · **Evidence:** `app/page.tsx:8`. The page reads cookies via `getAuthenticatedUser()` → `cookies()`, which opts the route into **dynamic** rendering, so Next does not full-route-cache it and there is **no** cross-user data leak today (verified). The `revalidate = 30` is effectively inert for this page. Flagged only because it is misleading: if a future refactor moved auth out of the page body (so `cookies()` is no longer called during render), the page could become statically cacheable and serve one user's financial data to another. Recommend removing `revalidate` from this page or adding `export const dynamic = "force-dynamic"` to make the intent explicit.

---

## Verified non-issues (checked, found sound)

These were specifically examined and are, as far as the code shows, correct — recorded so the owner knows the coverage:

- **No committed secrets.** `.gitignore:40` excludes `.env*`; `git ls-files` shows no `.env` tracked; history scan (`git log --all -S`, added-file scan) found no committed `.env`/keys/PEM. `.env` holds real secrets but is untracked. Good.
- **Authorization / IDOR — clean across all routes and both methods.** Every resource is scoped to the caller: categories (`findFirst {id,userId}` then 404), spending & spending/[id] (`where {id, series:{userId}}`), entries & entries/[id] (ownership traversed via `spendingItem.series.userId`, returns 404 not 403 to avoid existence leaks), income (`where {id,userId}` + P2025→404, valid Prisma extended-where), settings (`userId` keyed), materialize & series (`userId` filtered), account/delete & export (operate only on `user.id`). No client-supplied id is trusted without an ownership predicate. The cross-month entry router (`lib/spending/route-entry.ts`) reuses the already-verified owned series, so it cannot cross tenants.
- **SQL / NoSQL injection — none.** All DB access is via Prisma with parameterized args; no `$queryRaw`/`$executeRaw`/`queryRawUnsafe` anywhere. `month` and ids flow into Prisma `where` clauses as bound values.
- **Command / template / code injection — none.** No `child_process`, `exec`, `eval`, `new Function`, or dynamic `import()` of user data. The MT940 parser (`lib/import/mt940-parser.ts`, `try-mt940.ts`) is a CLI-only utility and is **not** wired to any HTTP route/upload (verified by grep).
- **XSS — no reachable sink.** No `dangerouslySetInnerHTML`, `innerHTML`, or `document.write`. User strings render as React text children (auto-escaped). `iconMap[id] || rawString` renders the unknown id as escaped text, not markup. Entry `link` is validated `^https?://` and rendered with `rel="noopener noreferrer"` (`spending-entry-detail-popin.tsx:198`). Receipts render as `<img src>` and are the user's own data (self-only at worst).
- **Open redirect — guarded.** OAuth callback `safeNext()` (`app/auth/callback/route.ts:9-13`) rejects absolute and protocol-relative (`//`) targets; the recovery/confirm destinations are hard-coded. The `proxy.ts` auth-route bounce assigns only `.pathname` on a same-origin cloned URL, so it cannot leave the origin.
- **SSRF — none.** The server makes outbound calls only to fixed Supabase/Upstash endpoints; no user-controlled URL is fetched server-side (the entry `link` is only stored and rendered, never requested).
- **Mass assignment — none.** Every write handler destructures an explicit field allowlist; `userId`, `month`, and `spent` are never client-writable (spending PUT and entries own `spent` server-side).
- **Password-reset / recovery design — robust.** `/api/auth/reset-password` requires both a live session and a signed, user-bound, expiring HMAC recovery token (`lib/recovery.ts`), uses `timingSafeEqual`, fails closed, and revokes sessions *before* the password change (fail-secure ordering). Recovery sessions are contained server-side by `session_id` in Redis (`markRecoverySession`/`isRecoverySession`), independent of the deletable `pw_recovery` cookie, and `proxy.ts` tears down a recovery session that tries to roam. All Redis revocation reads fail **closed**.
- **Account deletion — correct.** Builds the service-role client and fails fast if the key is missing *before* any destructive step; wipes via DB cascade; deletes the Supabase auth user (treating 404 as success); then `revokeUserSessions` so outstanding JWTs die immediately.
- **JWT algorithm confinement** is correct (`algorithms: ["ES256"]`), blocking `alg:none`/HS256 confusion; `exp` enforced (only `aud`/`iss` missing — L2).
- **Error handling** does not leak internals to clients: all API catch-blocks return generic messages; `console.*` logging of full errors is server-side only (Vercel logs).
- **`SITE_PASSWORD`** env var is documented but referenced nowhere in code (dead config; no gate implemented, but also no exposure).
- **Insecure randomness / weak crypto** — none in security paths: tokens come from Supabase/`crypto.randomUUID()`; HMAC uses SHA-256; no MD5/SHA1/DES/ECB, no `Math.random()` for secrets, no disabled TLS verification.

---

## Live infrastructure review (addendum — Supabase project `amzultrlvjljnjatzkfr` "PlanBudget")

The code review flagged Storage bucket RLS and DB-level RLS as out-of-repo scope. These were then checked directly against the live Supabase project. Results materially change M2 and add two findings.

### INFRA-1 — Avatar Storage policies are not owner-scoped (cross-user overwrite / delete / enumeration) · **Medium** · confirmed
The `avatars` bucket's four `storage.objects` policies (`authenticated` role) each check **only** `bucket_id = 'avatars'` — there is no `owner = auth.uid()` or path-prefix check on INSERT, UPDATE, DELETE, or SELECT:

```
INSERT  with_check: (bucket_id = 'avatars')
UPDATE  using:      (bucket_id = 'avatars')
DELETE  using:      (bucket_id = 'avatars')
SELECT  using:      (bucket_id = 'avatars')   + bucket is public:true
```

Object keys are `avatars/<userId>-<timestamp>.<ext>` (`lib/avatar-storage.ts`), where `<userId>` is the Supabase auth UID. Because the SELECT/list policy is unrestricted (the "Public Bucket Allows Listing" advisor), **any authenticated user can `list()` the bucket and read every user's exact object key**, thereby enumerating all user IDs, then **overwrite (`upsert:true`) or delete any other user's avatar**, or upload arbitrary objects under any key. Blast radius is limited to avatar images — content is capped to `image/jpeg|png|webp` and 2 MB by the bucket (see INFRA-3), so no script/HTML payload — but it is a genuine cross-tenant integrity + enumeration flaw (BOLA). **This supersedes M2:** the upload's *content* validation is fine; the *authorization* is broken.
**Fix:** scope each policy to the owner, e.g. `((storage.foldername(name))[1] = auth.uid()::text)` if you nest under a per-user folder, or `owner = auth.uid()` for UPDATE/DELETE; drop the broad SELECT policy (public buckets serve object URLs without it).

### INFRA-2 — Row Level Security disabled on all `public` tables · **Low** (latent High) · confirmed, currently not exploitable
Every application table (`User`, `Category`, `BudgetSeries`, `SpendingItem`, `SpendingEntry`, `IncomeSource`, `UserSettings`) has `rowsecurity = false` and zero policies. This is normally critical for a Supabase app whose **anon key ships in the browser bundle** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). It is **not currently exploitable** only because the Prisma-owned tables carry **no `GRANT`s to the `anon`/`authenticated` roles** — a live probe of `…/rest/v1/User` and `…/rest/v1/SpendingEntry` with the anon key returns `42501 permission denied for schema public`, and an anon `INSERT` into `Category` returns HTTP 401. So the entire DB is protected by *absent grants alone*, one `GRANT … TO anon` (which Supabase setup scripts, some extensions, and the SQL editor's convenience helpers can add) away from full public read/write. **Fix (defense-in-depth):** `ALTER TABLE … ENABLE ROW LEVEL SECURITY` on all seven tables even though PostgREST access is currently blocked, so that a stray future grant can't expose data. The app itself is unaffected (it reaches Postgres through Prisma's `DATABASE_URL`, not PostgREST).

### INFRA-3 — Bucket-level upload constraints are enforced (positive) · Info
The `avatars` bucket sets `file_size_limit = 2097152` (2 MB) and `allowed_mime_types = [image/jpeg, image/png, image/webp]` server-side. So M2's concern that "client-side compression is not a control" is mitigated for size/type — Supabase rejects oversized or non-image uploads regardless of the client. (Authorization is still broken — see INFRA-1.)

### INFRA-4 — Supabase Auth: leaked-password protection disabled · **Low** · confirmed
The security advisor reports HaveIBeenPwned breached-password checking is off, so users may set known-compromised passwords. **Fix:** enable it in Auth → Password settings (one toggle). Consider raising minimum password strength at the same time.

### Live-infra items with no finding
- **DB-level RLS bypass via anon key** — blocked (42501), see INFRA-2.
- **Only two projects on the org** (`PlanBudget`, `portfolio`); the app points at `PlanBudget` (`amzultrlvjljnjatzkfr`), confirmed against `.env`.

## Coverage notes
Full manual coverage of: all 11 API route files (every method), `lib/auth.ts`, `lib/supabase-server.ts`, `proxy.ts`, `lib/recovery*.ts`, both OAuth/confirm/signout routes, `app/page.tsx`, `app/account/page.tsx`, `app/login/page.tsx`, `app/auth/forgot-password` + reset flow, upload path (`avatar-storage.ts`, `profile-avatar.tsx`), output/render sinks, `lib/csv.ts`, `lib/api.ts`, `lib/user.ts`, `lib/prisma.ts`, config files, and dependency audit. **Not** assessed (out of code scope, flagged where relevant): Supabase **Storage bucket RLS policies** and **Auth rate-limit settings** (dashboard config, not in repo — see M2/L6), and the live cookie attributes Supabase emits at runtime (see L3). The bulk chart/UI components under `components/` were spot-checked for render sinks rather than read line-by-line, as they consume already-owned, server-mapped data.
