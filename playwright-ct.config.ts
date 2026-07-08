import path from "node:path";
import { defineConfig, devices } from "@playwright/experimental-ct-react";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// Playwright transpiles this config to CommonJS (the project is not
// `"type": "module"`), so `__dirname` is available while `import.meta` is not.
const mock = (relative: string) => path.resolve(__dirname, relative);

/**
 * Playwright Component Testing config for visual-regression screenshots.
 *
 * We mount app components in a real browser (Chromium) with fixture props and
 * compare rendered screenshots against committed baselines. This covers the
 * whole UI — every screen and feature popin/modal — without needing Supabase,
 * a database, or a running Next server, because the app's screens are
 * prop-driven client components.
 *
 * The Vite config mirrors `vitest.config.ts`: `@vitejs/plugin-react` for JSX
 * and `vite-tsconfig-paths` so components resolve the `@/` alias exactly as in
 * the app. Tailwind is applied via the project's `postcss.config.mjs`, which
 * Vite picks up automatically when `playwright/index.tsx` imports
 * `app/globals.css`.
 *
 * Two projects capture the mobile-first layout and its `sm:` desktop variant.
 */
export default defineConfig({
  testDir: "./visual",
  snapshotDir: "./visual/__screenshots__",
  // Keep baselines identical regardless of the OS the test happens to run on,
  // so a macOS dev run and a Linux CI run compare against the same files.
  snapshotPathTemplate:
    "{snapshotDir}/{testFilePath}/{arg}-{projectName}{ext}",
  fullyParallel: true,
  forbidOnly: process.env.CI === "true",
  retries: 0,
  reporter: process.env.CI === "true" ? "line" : [["list"]],

  use: {
    // retries is 0, so keep a trace only when a test fails — useful for
    // debugging a screenshot diff locally.
    trace: "retain-on-failure",
    ctViteConfig: {
      plugins: [tsconfigPaths(), react()],
      resolve: {
        // Swap network/router-bound modules for deterministic stubs so screens
        // mount identically every run. Exact-string aliases take precedence
        // over the `@/` tsconfig-paths resolution. See visual/mocks/.
        alias: [
          { find: "@/lib/supabase", replacement: mock("./visual/mocks/supabase.ts") },
          { find: "next/navigation", replacement: mock("./visual/mocks/next-navigation.ts") },
          { find: "next/link", replacement: mock("./visual/mocks/next-link.tsx") },
        ],
      },
    },
  },

  // Sub-pixel anti-aliasing differences are expected across runs; `threshold`
  // forgives per-pixel color jitter, and `maxDiffPixels` caps how many pixels
  // may differ. The cap is ABSOLUTE, not a ratio: a ratio scales with viewport
  // area, so on the 1280x900 desktop project a real UI change the size of one
  // list row (~1% of the frame) fit inside the old `maxDiffPixelRatio: 0.01`
  // and passed against a stale baseline. 1000px is far above residual
  // anti-aliasing noise and far below any human-visible layout change.
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 1000,
      threshold: 0.2,
      animations: "disabled",
      scale: "css",
    },
  },

  projects: [
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
      },
    },
  ],
});
