// Test setup, loaded via `setupFiles` in vitest.config.ts (runs before each
// test file's module graph is evaluated).

// --- React 19 scheduler vs jsdom MessageChannel ---------------------------
// jsdom registers a global `MessageChannel` whose ports never actually deliver
// messages. React 19's scheduler prefers MessageChannel for flushing work, so
// any render in a jsdom environment (renderHook/render) posts a task that is
// never picked up and hangs forever. Removing jsdom's broken implementation
// before React's scheduler module initializes makes it fall back to setTimeout.
// Harmless in the node environment (no MessageChannel there to begin with).
// @ts-expect-error - deleting an optional global on purpose
delete globalThis.MessageChannel;

// --- Testing Library matchers ---------------------------------------------
// Adds `toBeInTheDocument`, `toHaveTextContent`, etc. to `expect`.
import "@testing-library/jest-dom/vitest";
