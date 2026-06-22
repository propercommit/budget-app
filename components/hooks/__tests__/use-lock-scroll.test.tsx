// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLockScroll } from "@/components/hooks/use-lock-scroll";

beforeEach(() => {
  // Reset any body styles a prior test may have left behind.
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.overflow = "";
  window.scrollTo(0, 0);
});

describe("useLockScroll — locking", () => {
  it("does nothing while unlocked", () => {
    renderHook(() => useLockScroll(false));
    expect(document.body.style.position).toBe("");
    expect(document.body.style.overflow).toBe("");
  });

  it("pins the body and records the current scroll offset when locked", () => {
    // jsdom always reports scrollY 0, so stub it to a realistic offset.
    Object.defineProperty(window, "scrollY", { value: 250, configurable: true });

    renderHook(() => useLockScroll(true));

    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.top).toBe("-250px");
    // jsdom serializes a bare "0" length to "0px".
    expect(document.body.style.left).toBe("0px");
    expect(document.body.style.right).toBe("0px");
    expect(document.body.style.overflow).toBe("hidden");
  });
});

describe("useLockScroll — cleanup restores scroll position", () => {
  it("clears the inline styles and scrolls back to the saved offset on unlock", () => {
    Object.defineProperty(window, "scrollY", { value: 180, configurable: true });
    const scrollToSpy = vi.spyOn(window, "scrollTo");

    // Re-render with isLocked flipped to false so the effect cleanup runs.
    const { rerender } = renderHook(({ locked }) => useLockScroll(locked), {
      initialProps: { locked: true },
    });

    rerender({ locked: false });

    expect(document.body.style.position).toBe("");
    expect(document.body.style.top).toBe("");
    expect(document.body.style.overflow).toBe("");
    // Restores the offset captured at lock time.
    expect(scrollToSpy).toHaveBeenCalledWith(0, 180);
  });

  it("cleans up on unmount", () => {
    Object.defineProperty(window, "scrollY", { value: 40, configurable: true });
    const { unmount } = renderHook(() => useLockScroll(true));

    expect(document.body.style.position).toBe("fixed");
    unmount();
    expect(document.body.style.position).toBe("");
  });
});
