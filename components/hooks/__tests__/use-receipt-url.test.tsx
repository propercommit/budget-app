// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/lib/api", () => ({
  getReceiptUrl: vi.fn(),
}));

import { useReceiptUrl } from "@/components/hooks/use-receipt-url";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api-error";

type Props = { id: string | null; path: string | null };

const renderReceiptUrl = (initial: Props, onGone?: (id: string) => void) =>
  renderHook(({ id, path }: Props) => useReceiptUrl(id, path, onGone), { initialProps: initial });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useReceiptUrl — when not to fetch", () => {
  it("never fetches for a temp- entry id and stays idle", () => {
    const { result } = renderReceiptUrl({ id: "temp-123", path: "u1/temp-123" });

    expect(api.getReceiptUrl).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
    expect(result.current.url).toBeNull();
  });

  it("never fetches when receiptPath is null and stays idle", () => {
    const { result } = renderReceiptUrl({ id: "e1", path: null });

    expect(api.getReceiptUrl).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
    expect(result.current.url).toBeNull();
  });
});

describe("useReceiptUrl — happy path and cache", () => {
  it("fetches a signed url, then serves the same id from cache without refetching", async () => {
    vi.mocked(api.getReceiptUrl).mockResolvedValue({ url: "https://signed/1" });

    const { result, rerender } = renderReceiptUrl({ id: "e1", path: "u1/e1" });

    expect(result.current.status).toBe("loading");

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    expect(result.current.url).toBe("https://signed/1");
    expect(api.getReceiptUrl).toHaveBeenCalledWith("e1");

    // Page away (the popin closes) and back to the same entry — the cached
    // url serves synchronously, no second network mint.
    rerender({ id: null, path: null });

    expect(result.current.status).toBe("idle");

    rerender({ id: "e1", path: "u1/e1" });

    expect(result.current.status).toBe("ready");
    expect(result.current.url).toBe("https://signed/1");
    expect(api.getReceiptUrl).toHaveBeenCalledTimes(1);
  });
});

describe("useReceiptUrl — failure semantics", () => {
  it.each(["no_receipt", "Entry not found"])(
    "a 404 %s is not an error: idle + onReceiptGone",
    async (code) => {
      vi.mocked(api.getReceiptUrl).mockRejectedValue(new ApiError(code, 404));
      const onGone = vi.fn();

      const { result } = renderReceiptUrl({ id: "e1", path: "u1/e1" }, onGone);

      await waitFor(() => {
        expect(onGone).toHaveBeenCalledWith("e1");
      });

      expect(result.current.status).toBe("idle");
      expect(result.current.url).toBeNull();
    }
  );

  it("a 500 becomes the error state and does not call onReceiptGone", async () => {
    vi.mocked(api.getReceiptUrl).mockRejectedValue(new ApiError("Internal server error", 500));
    const onGone = vi.fn();

    const { result } = renderReceiptUrl({ id: "e1", path: "u1/e1" }, onGone);

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });

    expect(result.current.url).toBeNull();
    expect(onGone).not.toHaveBeenCalled();
  });

  it("retry() evicts the cache and refetches even while the cached url is fresh", async () => {
    vi.mocked(api.getReceiptUrl)
      .mockResolvedValueOnce({ url: "https://signed/1" })
      .mockResolvedValueOnce({ url: "https://signed/2" });

    const { result } = renderReceiptUrl({ id: "e1", path: "u1/e1" });

    await waitFor(() => {
      expect(result.current.url).toBe("https://signed/1");
    });

    act(() => {
      result.current.retry();
    });

    // A fresh cache entry would have served https://signed/1 — the second
    // url proves retry evicted it and truly refetched.
    await waitFor(() => {
      expect(result.current.url).toBe("https://signed/2");
    });

    expect(result.current.status).toBe("ready");
    expect(api.getReceiptUrl).toHaveBeenCalledTimes(2);
  });

  it("markBroken() flips to error and evicts, so getFreshUrl refetches from an empty cache", async () => {
    vi.mocked(api.getReceiptUrl)
      .mockResolvedValueOnce({ url: "https://signed/1" })
      .mockResolvedValueOnce({ url: "https://signed/2" });

    const { result } = renderReceiptUrl({ id: "e1", path: "u1/e1" });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    // The <img> onError path: the url died server-side.
    act(() => {
      result.current.markBroken();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.url).toBeNull();

    let fresh: string | null = null;

    await act(async () => {
      fresh = await result.current.getFreshUrl();
    });

    expect(fresh).toBe("https://signed/2");
    expect(result.current.status).toBe("ready");
    expect(api.getReceiptUrl).toHaveBeenCalledTimes(2);
  });
});

describe("useReceiptUrl — getFreshUrl expiry (TTL 600s, 60s margin)", () => {
  it("serves the cached url while fresh and refetches once past expiresAt minus the margin", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });

    try {
      const t0 = new Date("2026-07-15T12:00:00Z");

      vi.setSystemTime(t0);

      vi.mocked(api.getReceiptUrl)
        .mockResolvedValueOnce({ url: "https://signed/1" })
        .mockResolvedValueOnce({ url: "https://signed/2" });

      const { result } = renderReceiptUrl({ id: "e1", path: "u1/e1" });

      // Flush the mount fetch (microtasks only — timers are real).
      await act(async () => {});

      expect(result.current.status).toBe("ready");

      // 539s in: still before expiresAt (t0 + 600s) minus the 60s margin.
      vi.setSystemTime(new Date(t0.getTime() + 539_000));

      let url: string | null = null;

      await act(async () => {
        url = await result.current.getFreshUrl();
      });

      expect(url).toBe("https://signed/1");
      expect(api.getReceiptUrl).toHaveBeenCalledTimes(1);

      // 541s in: inside the margin window — a popin left open this long must
      // mint a brand-new url instead of feeding a dying one to the viewer.
      vi.setSystemTime(new Date(t0.getTime() + 541_000));

      await act(async () => {
        url = await result.current.getFreshUrl();
      });

      expect(url).toBe("https://signed/2");
      expect(api.getReceiptUrl).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
