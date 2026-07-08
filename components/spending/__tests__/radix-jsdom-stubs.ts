import { vi } from "vitest";

/**
 * Radix Select (the expanded card's sort control) pokes APIs jsdom lacks;
 * install no-op stand-ins. Call from a `beforeAll` in each jsdom test file —
 * deliberately kept out of the global vitest setup (see CLAUDE.md testing
 * notes on per-file jsdom stubs).
 */
export function installRadixJsdomStubs(): void {

    globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };

    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    Element.prototype.setPointerCapture = vi.fn();
}
