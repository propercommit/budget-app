// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/api", () => ({
  getSpending: vi.fn(),
  createSpending: vi.fn(),
  updateSpending: vi.fn(),
  deleteSpending: vi.fn(),
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

import { useSpending } from "@/components/hooks/use-spending";
import * as api from "@/lib/api";
import toast from "react-hot-toast";
import type { SpendingItem, SpendingEntry } from "@/lib/types";

const MONTH = "2026-06";

// All money is integer cents (e.g. 425 = $4.25), matching the app's storage.
const entry = (over: Partial<SpendingEntry> = {}): SpendingEntry => ({
  id: "e1",
  name: "Coffee",
  amount: 425,
  direction: "debit",
  receiptUrl: null,
  link: null,
  date: "2026-06-02",
  spendingItemId: "s1",
  ...over,
});

const item = (over: Partial<SpendingItem> = {}): SpendingItem => ({
  id: "s1",
  name: "Eating out",
  icon: "fork",
  budgeted: 20000,
  spent: 0,
  month: MONTH,
  startDate: "2026-06-01",
  endDate: null,
  note: null,
  categoryId: "c1",
  entries: [],
  ...over,
});

const data = (items: SpendingItem[]) => ({ [MONTH]: items });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useSpending — spending item create (optimistic)", () => {
  it("adds a temp item in the right month then replaces it on success", async () => {
    const server = item({ id: "server" });
    let resolve!: (v: SpendingItem) => void;
    vi.mocked(api.createSpending).mockReturnValue(
      new Promise<SpendingItem>((r) => { resolve = r; }) as ReturnType<typeof api.createSpending>
    );

    const { result } = renderHook(() => useSpending(data([])));

    let pending!: Promise<SpendingItem | null>;
    act(() => {
      pending = result.current.createSpending(MONTH, {
        name: "Eating out",
        icon: "fork",
        categoryId: "c1",
        month: MONTH,
      });
    });

    expect(result.current.spendingData[MONTH]).toHaveLength(1);
    expect(result.current.spendingData[MONTH][0].id).toMatch(/^temp-/);
    expect(result.current.spendingData[MONTH][0].spent).toBe(0);

    await act(async () => {
      resolve(server);
      await pending;
    });

    expect(result.current.spendingData[MONTH]).toEqual([server]);
  });

  it("rolls back the temp item and toasts on failure", async () => {
    vi.mocked(api.createSpending).mockRejectedValue(new Error("x"));
    const { result } = renderHook(() => useSpending(data([])));

    let returned: SpendingItem | null = item();
    await act(async () => {
      returned = await result.current.createSpending(MONTH, {
        name: "Eating out",
        icon: "fork",
        categoryId: "c1",
        month: MONTH,
      });
    });

    expect(returned).toBeNull();
    expect(result.current.spendingData[MONTH]).toEqual([]);
    expect(toast.error).toHaveBeenCalledWith("Failed to create spending item");
  });
});

describe("useSpending — spending item update / delete", () => {
  it("update swaps the optimistic item for the server record on success", async () => {
    const server = item({ name: "Restaurants" });
    vi.mocked(api.updateSpending).mockResolvedValue(server);
    const optimistic = item({ name: "Restaurants (pending)" });
    const { result } = renderHook(() => useSpending(data([item()])));

    await act(async () => {
      await result.current.updateSpending(MONTH, "s1", { name: "Restaurants" }, optimistic);
    });

    expect(result.current.spendingData[MONTH][0]).toEqual(server);
  });

  it("update rolls back to original on failure", async () => {
    vi.mocked(api.updateSpending).mockRejectedValue(new Error("x"));
    const original = item();
    const { result } = renderHook(() => useSpending(data([original])));

    await act(async () => {
      await result.current.updateSpending(MONTH, "s1", { name: "X" }, item({ name: "X" }));
    });

    expect(result.current.spendingData[MONTH][0]).toEqual(original);
    expect(toast.error).toHaveBeenCalledWith("Failed to update spending item");
  });

  it("delete removes immediately and re-inserts on failure", async () => {
    vi.mocked(api.deleteSpending).mockRejectedValue(new Error("x"));
    const original = item();
    const { result } = renderHook(() => useSpending(data([original])));

    let ok = true;
    await act(async () => {
      ok = await result.current.deleteSpending(MONTH, "s1");
    });

    expect(ok).toBe(false);
    expect(result.current.spendingData[MONTH]).toEqual([original]);
    expect(toast.error).toHaveBeenCalledWith("Failed to delete spending item");
  });
});

describe("useSpending — entry create recomputes spent", () => {
  it("bumps spent optimistically and replaces the temp entry on success", async () => {
    const realEntry = entry({ id: "real", amount: 425 });
    let resolve!: (v: SpendingEntry) => void;
    vi.mocked(api.createEntry).mockReturnValue(
      new Promise<SpendingEntry>((r) => { resolve = r; }) as ReturnType<typeof api.createEntry>
    );

    const { result } = renderHook(() => useSpending(data([item({ spent: 1000 })])));

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.createEntry(MONTH, "s1", {
        name: "Coffee",
        amount: 425,
        date: "2026-06-02",
      });
    });

    // spent moved up by the entry amount and a temp entry was appended.
    expect(result.current.spendingData[MONTH][0].spent).toBe(1425);
    expect(result.current.spendingData[MONTH][0].entries?.[0].id).toMatch(/^temp-/);

    await act(async () => {
      resolve(realEntry);
      await pending;
    });

    // Temp entry replaced; spent unchanged.
    expect(result.current.spendingData[MONTH][0].entries?.[0]).toEqual(realEntry);
    expect(result.current.spendingData[MONTH][0].spent).toBe(1425);
  });

  it("sums entry cents exactly with no accumulated float error", async () => {
    // The classic 0.1 + 0.2 case, now integer cents: spent 10c + entry 20c =
    // 30c exactly, asserted with toBe (the migration removed the float drift).
    vi.mocked(api.createEntry).mockResolvedValue(entry({ id: "real", amount: 20 }));
    const { result } = renderHook(() => useSpending(data([item({ spent: 10, entries: [] })])));

    await act(async () => {
      await result.current.createEntry(MONTH, "s1", { name: "x", amount: 20, date: "2026-06-02" });
    });

    expect(result.current.spendingData[MONTH][0].spent).toBe(30);
  });

  it("rolls back the spent bump and temp entry on failure", async () => {
    vi.mocked(api.createEntry).mockRejectedValue(new Error("x"));
    const { result } = renderHook(() => useSpending(data([item({ spent: 1000 })])));

    await act(async () => {
      await result.current.createEntry(MONTH, "s1", { name: "Coffee", amount: 425, date: "2026-06-02" });
    });

    expect(result.current.spendingData[MONTH][0].spent).toBe(1000);
    expect(result.current.spendingData[MONTH][0].entries).toEqual([]);
    expect(toast.error).toHaveBeenCalledWith("Failed to create entry");
  });
});

describe("useSpending — entry update recomputes spent by diff", () => {
  it("applies the amount delta to spent on success", async () => {
    vi.mocked(api.updateEntry).mockResolvedValue(undefined);
    const start = item({ spent: 425, entries: [entry({ amount: 425 })] });
    const { result } = renderHook(() => useSpending(data([start])));

    await act(async () => {
      await result.current.updateEntry(MONTH, "s1", "e1", {
        name: "Coffee", amount: 1000, date: "2026-06-02",
      });
    });

    // diff = 1000 - 425 => spent becomes 1000
    expect(result.current.spendingData[MONTH][0].spent).toBe(1000);
    expect(result.current.spendingData[MONTH][0].entries?.[0].amount).toBe(1000);
  });

  it("rolls back the diff and restores the original entry on failure", async () => {
    vi.mocked(api.updateEntry).mockRejectedValue(new Error("x"));
    const original = entry({ amount: 425 });
    const start = item({ spent: 425, entries: [original] });
    const { result } = renderHook(() => useSpending(data([start])));

    await act(async () => {
      await result.current.updateEntry(MONTH, "s1", "e1", {
        name: "Changed", amount: 1000, date: "2026-06-09",
      });
    });

    expect(result.current.spendingData[MONTH][0].spent).toBe(425);
    expect(result.current.spendingData[MONTH][0].entries?.[0]).toEqual(original);
    expect(toast.error).toHaveBeenCalledWith("Failed to update entry");
  });
});

describe("useSpending — entry delete recomputes spent", () => {
  it("subtracts the entry amount from spent and removes it on success", async () => {
    vi.mocked(api.deleteEntry).mockResolvedValue(undefined);
    const start = item({ spent: 1425, entries: [entry({ amount: 425 })] });
    const { result } = renderHook(() => useSpending(data([start])));

    await act(async () => {
      await result.current.deleteEntry(MONTH, "s1", "e1");
    });

    expect(result.current.spendingData[MONTH][0].spent).toBe(1000);
    expect(result.current.spendingData[MONTH][0].entries).toEqual([]);
  });

  it("restores the entry and spent on failure", async () => {
    vi.mocked(api.deleteEntry).mockRejectedValue(new Error("x"));
    const original = entry({ amount: 425 });
    const start = item({ spent: 1425, entries: [original] });
    const { result } = renderHook(() => useSpending(data([start])));

    await act(async () => {
      await result.current.deleteEntry(MONTH, "s1", "e1");
    });

    expect(result.current.spendingData[MONTH][0].spent).toBe(1425);
    expect(result.current.spendingData[MONTH][0].entries).toEqual([original]);
    expect(toast.error).toHaveBeenCalledWith("Failed to delete entry");
  });
});

describe("useSpending — direction-aware entry math", () => {
  it("a credit entry lowers spent on create and can push it negative", async () => {
    vi.mocked(api.createEntry).mockResolvedValue(entry({ id: "real", amount: 15_000, direction: "credit" }));
    const { result } = renderHook(() => useSpending(data([item({ spent: 0, entries: [] })])));

    await act(async () => {
      await result.current.createEntry(MONTH, "s1", {
        name: "Refund", amount: 15_000, date: "2026-06-02", direction: "credit",
      });
    });

    expect(result.current.spendingData[MONTH][0].spent).toBe(-15_000);
  });

  it("rolls back a failed credit create exactly", async () => {
    vi.mocked(api.createEntry).mockRejectedValue(new Error("x"));
    const { result } = renderHook(() => useSpending(data([item({ spent: 1000 })])));

    await act(async () => {
      await result.current.createEntry(MONTH, "s1", {
        name: "Refund", amount: 425, date: "2026-06-02", direction: "credit",
      });
    });

    expect(result.current.spendingData[MONTH][0].spent).toBe(1000);
    expect(result.current.spendingData[MONTH][0].entries).toEqual([]);
  });

  it("deleting a credit raises spent", async () => {
    vi.mocked(api.deleteEntry).mockResolvedValue(undefined);
    // 200.00 debit + 150.00 credit → spent 5000; removing the credit → 20000.
    const start = item({
      spent: 5_000,
      entries: [
        entry({ id: "e-debit", amount: 20_000 }),
        entry({ id: "e-credit", amount: 15_000, direction: "credit" }),
      ],
    });
    const { result } = renderHook(() => useSpending(data([start])));

    await act(async () => {
      await result.current.deleteEntry(MONTH, "s1", "e-credit");
    });

    expect(result.current.spendingData[MONTH][0].spent).toBe(20_000);
  });

  it("restores a negative spent exactly when deleting a credit fails", async () => {
    vi.mocked(api.deleteEntry).mockRejectedValue(new Error("x"));
    const credit = entry({ id: "e-credit", amount: 15_000, direction: "credit" });
    const start = item({ spent: -15_000, entries: [credit] });
    const { result } = renderHook(() => useSpending(data([start])));

    await act(async () => {
      await result.current.deleteEntry(MONTH, "s1", "e-credit");
    });

    expect(result.current.spendingData[MONTH][0].spent).toBe(-15_000);
    expect(result.current.spendingData[MONTH][0].entries).toEqual([credit]);
  });

  it("update flips a debit to a credit and spent follows", async () => {
    vi.mocked(api.updateEntry).mockResolvedValue(undefined);
    const start = item({ spent: 425, entries: [entry({ amount: 425 })] });
    const { result } = renderHook(() => useSpending(data([start])));

    await act(async () => {
      await result.current.updateEntry(MONTH, "s1", "e1", {
        name: "Coffee refund", amount: 425, date: "2026-06-02", direction: "credit",
      });
    });

    expect(result.current.spendingData[MONTH][0].spent).toBe(-425);
    expect(result.current.spendingData[MONTH][0].entries?.[0].direction).toBe("credit");
  });

  it("flips a 10000-cent debit to credit: spent moves by −20000 and settles unchanged", async () => {
    let resolve!: () => void;
    vi.mocked(api.updateEntry).mockReturnValue(
      new Promise<void>((r) => { resolve = r; }) as ReturnType<typeof api.updateEntry>
    );

    const start = item({ spent: 10_000, entries: [entry({ amount: 10_000 })] });
    const { result } = renderHook(() => useSpending(data([start])));

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.updateEntry(MONTH, "s1", "e1", {
        name: "Coffee", amount: 10_000, date: "2026-06-02", direction: "credit",
      });
    });

    // Optimistic: unapply the +10000 debit, apply the −10000 credit → net −20000.
    expect(result.current.spendingData[MONTH][0].spent).toBe(-10_000);

    await act(async () => {
      resolve();
      await pending;
    });

    // Settled: the optimistic value already equals the server recompute — no flicker.
    expect(result.current.spendingData[MONTH][0].spent).toBe(-10_000);
    expect(result.current.spendingData[MONTH][0].entries?.[0].direction).toBe("credit");
  });

  it("update keeps the stored direction when the form sends none", async () => {
    vi.mocked(api.updateEntry).mockResolvedValue(undefined);
    const start = item({ spent: -425, entries: [entry({ amount: 425, direction: "credit" })] });
    const { result } = renderHook(() => useSpending(data([start])));

    await act(async () => {
      await result.current.updateEntry(MONTH, "s1", "e1", {
        name: "Coffee", amount: 1000, date: "2026-06-02",
      });
    });

    // Still a credit: unapply −425 → 0, then apply credit 1000 → −1000.
    expect(result.current.spendingData[MONTH][0].spent).toBe(-1000);
    expect(result.current.spendingData[MONTH][0].entries?.[0].direction).toBe("credit");
  });

  it("rolls back a direction flip exactly on failure", async () => {
    vi.mocked(api.updateEntry).mockRejectedValue(new Error("x"));
    const original = entry({ amount: 425 });
    const start = item({ spent: 425, entries: [original] });
    const { result } = renderHook(() => useSpending(data([start])));

    await act(async () => {
      await result.current.updateEntry(MONTH, "s1", "e1", {
        name: "X", amount: 425, date: "2026-06-02", direction: "credit",
      });
    });

    expect(result.current.spendingData[MONTH][0].spent).toBe(425);
    expect(result.current.spendingData[MONTH][0].entries?.[0]).toEqual(original);
  });
});

describe("useSpending — month isolation", () => {
  it("mutating one month leaves other months untouched", async () => {
    vi.mocked(api.deleteSpending).mockResolvedValue(undefined);
    const other = item({ id: "other", month: "2026-05" });
    const { result } = renderHook(() =>
      useSpending({ [MONTH]: [item()], "2026-05": [other] })
    );

    await act(async () => {
      await result.current.deleteSpending(MONTH, "s1");
    });

    expect(result.current.spendingData[MONTH]).toEqual([]);
    expect(result.current.spendingData["2026-05"]).toEqual([other]);
  });
});
