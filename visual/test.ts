/**
 * Shared test base for the visual-regression suite.
 *
 * Every spec imports `test`/`expect` from here instead of directly from
 * `@playwright/experimental-ct-react` so that clock determinism is applied in
 * one place. Several components read `new Date()` at render time —
 * `MonthPicker` (forward-arrow bound), the create-entry popin (default date) —
 * and `<Dashboard>` renders `MonthPicker` transitively, so pinning the clock
 * per-spec is easy to forget and silently makes a baseline drift with the
 * wall clock. Pinning it on the `page` fixture covers all of them.
 */
import { test as base, expect } from "@playwright/experimental-ct-react";

/** Fixed "now" for all screenshots — matches the fixtures' selected month. */
export const FIXED_NOW = new Date("2026-06-15T12:00:00Z");

export const test = base.extend({
  // The fixture-provider callback is named `provide` (not the conventional
  // `use`) so ESLint's react-hooks rule doesn't mistake it for React's `use`.
  page: async ({ page }, provide) => {
    await page.clock.setFixedTime(FIXED_NOW);
    await provide(page);
  },
});

export { expect };
