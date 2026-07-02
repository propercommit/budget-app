# Visual regression tests

Screenshot-based regression tests for the whole UI — every screen and feature —
built on **Playwright Component Testing** (`@playwright/experimental-ct-react`).
Components are mounted in a real Chromium browser with fixture props and compared
against committed baseline PNGs. No Supabase, database, or running Next server is
needed: the app's screens are prop-driven client components.

## Running

```bash
pnpm test:visual           # run against committed baselines
pnpm test:visual:update    # regenerate baselines (after an intentional UI change)
```

Baselines are captured for two viewports — **mobile** (390×844) and **desktop**
(1280×900) — and committed under `visual/__screenshots__/`. Review image diffs in
`test-results/` (or `pnpm exec playwright show-report`) when a test fails.

> First run on a new machine needs the browser: `pnpm exec playwright install chromium`.

## Layout

- `visual/screens/` — full screens: dashboard, login, forgot/reset password, account (+ its modals).
- `visual/components/` — feature components and popins: spending, income, trends, budget overview, charts, category, month picker, misc, UI primitives.
- `visual/fixtures.ts` — deterministic shared data (fixed months/dates/amounts).
- `visual/providers.tsx` — `SettingsProvider` wrapper for components that read `useSettings()`.
- `visual/test.ts` — shared `test`/`expect`; pins the clock to `FIXED_NOW` so `new Date()`-driven UI is stable.
- `visual/mocks/` — deterministic stubs for `@/lib/supabase`, `next/navigation`, `next/link`, aliased in via `playwright-ct.config.ts`.

## Determinism

Screenshots must be byte-stable across runs. This is achieved by:

- **Fixed data** — all fixture months/dates/amounts are constant.
- **Pinned clock** — the shared test base sets a fixed `Date`, so `MonthPicker`,
  the create-entry popin, and anything else reading `new Date()` render identically.
- **Disabled animations** — Playwright freezes CSS animations/transitions at capture.
- **Pinned fonts** — `playwright/harness.css` fixes the font stack (`next/font` is
  unavailable outside Next).
- **Stubbed network/router** — the `visual/mocks/*` aliases remove Supabase calls and
  the Next router, so a fixed signed-in user renders every time.

Because rendering depends on the host's font rasterisation, regenerate baselines on a
consistent environment (ideally the same one CI uses).

## Conventions

- Import `test`/`expect` from `../test`, not directly from Playwright.
- Wrap components that use `useSettings()` in `<Providers>`.
- Popins/modals that portal to `<body>` (Radix dialogs, `ReceiptViewer`) are captured
  with `expect(page).toHaveScreenshot()`; inline components use `expect(component)`.
