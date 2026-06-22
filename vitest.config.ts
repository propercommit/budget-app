import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // `tsconfigPaths` resolves the `@/` alias from tsconfig.json so tests can
  // import source via `@/lib/...` exactly like the app does.
  // `react` is here for the future component-test PR (jsdom + Testing Library);
  // pure-logic tests in this PR run in the default `node` environment.
  plugins: [tsconfigPaths(), react()],
  test: {
    globals: true,
    // Pure-logic tests run in node. Component tests (added in a later PR) opt
    // into jsdom per-file with a `// @vitest-environment jsdom` docblock, or we
    // can switch this default once those land.
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "dist"],
    pool: "forks",
    // Removes jsdom's non-delivering MessageChannel (so React 19's scheduler
    // doesn't hang) and registers @testing-library/jest-dom matchers. See
    // vitest.setup.ts for the why.
    setupFiles: ["./vitest.setup.ts"],
  },
});
