// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/lib/api", () => ({
  getSpending: vi.fn(),
  createSpending: vi.fn(),
  updateSpending: vi.fn(),
  deleteSpending: vi.fn(),
  materializeMonth: vi.fn(),
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
  issueReceiptUpload: vi.fn(),
  confirmReceipt: vi.fn(),
  deleteReceipt: vi.fn(),
}));

// The direct-to-Storage upload leg — the hook-test seam (never mock
// @supabase/supabase-js here; the browser client comes from @supabase/ssr).
vi.mock("@/lib/upload-receipt", () => ({
  uploadReceiptFile: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({
  showErrorToast: vi.fn(),
}));

// The routed-entry flow announces the move with a plain success toast.
vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

import { StrictMode } from "react";
import { useSpending, type CreateSpendingConflict } from "@/components/hooks/use-spending";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import { uploadReceiptFile } from "@/lib/upload-receipt";
// Deliberately NOT mocked: the marker lifecycle is exercised end-to-end
// against jsdom's real localStorage.
import { PENDING_RECEIPT_KEY_PREFIX, addPendingReceipt } from "@/lib/receipt-resume";
import { showErrorToast } from "@/lib/toast";
import toast from "react-hot-toast";
import type { SpendingItem, SpendingEntry } from "@/lib/types";

const MONTH = "2026-06";

// All money is integer cents (e.g. 425 = $4.25), matching the app's storage.
const entry = (over: Partial<SpendingEntry> = {}): SpendingEntry => ({
  id: "e1",
  name: "Coffee",
  amount: 425,
  direction: "debit",
  receiptPath: null,
  link: null,
  date: "2026-06-02",
  spendingItemId: "s1",
  ...over,
});

const item = (over: Partial<SpendingItem> = {}): SpendingItem => ({
  id: "s1",
  seriesId: "series-1",
  name: "Eating out",
  icon: "fork",
  recurring: true,
  budgeted: 20000,
  spent: 0,
  month: MONTH,
  note: null,
  categoryId: "c1",
  entries: [],
  ...over,
});

const data = (items: SpendingItem[]) => ({ [MONTH]: items });

const markerKey = (entryId: string) => `${PENDING_RECEIPT_KEY_PREFIX}${entryId}`;

beforeEach(() => {
  vi.clearAllMocks();

  localStorage.clear();
});

describe("useSpending — spending item create (optimistic)", () => {
  it("adds a temp item in the right month then replaces it on success", async () => {
    const server = item({ id: "server" });
    let resolve!: (v: SpendingItem) => void;
    vi.mocked(api.createSpending).mockReturnValue(
      new Promise<SpendingItem>((r) => { resolve = r; }) as ReturnType<typeof api.createSpending>
    );

    const { result } = renderHook(() => useSpending(data([])));

    let pending!: Promise<SpendingItem | CreateSpendingConflict | null>;
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

    let returned: SpendingItem | CreateSpendingConflict | null = item();
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
    expect(showErrorToast).toHaveBeenCalledWith('Couldn\'t save "Eating out"', { retry: expect.any(Function) });
  });

  // The three structured 409s are form states, never toasts — the hook rolls
  // back the optimistic item and hands the code to the popin.
  it.each(["series_dormant", "series_not_in_month", "series_active_this_month"] as const)(
    "returns %s to the caller with a rollback and no toast",
    async (code) => {
      vi.mocked(api.createSpending).mockRejectedValue(new Error(code));
      const { result } = renderHook(() => useSpending(data([])));

      let returned: SpendingItem | CreateSpendingConflict | null = null;
      await act(async () => {
        returned = await result.current.createSpending(MONTH, {
          name: "Eating out",
          icon: "fork",
          categoryId: "c1",
          month: MONTH,
        });
      });

      expect(returned).toBe(code);
      expect(result.current.spendingData[MONTH]).toEqual([]);
      expect(showErrorToast).not.toHaveBeenCalled();
    }
  );
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
    expect(showErrorToast).toHaveBeenCalledWith('Couldn\'t save "X"', { retry: expect.any(Function) });
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
    expect(showErrorToast).toHaveBeenCalledWith('Couldn\'t delete "Eating out"', { retry: expect.any(Function) });
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
    expect(showErrorToast).toHaveBeenCalledWith('Couldn\'t save "Coffee"', { retry: expect.any(Function) });
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
    expect(showErrorToast).toHaveBeenCalledWith('Couldn\'t save "Changed"', { retry: expect.any(Function) });
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
    expect(showErrorToast).toHaveBeenCalledWith('Couldn\'t delete "Coffee"', { retry: expect.any(Function) });
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

describe("useSpending — cross-month entry routing (D19)", () => {
  const routedResult = (targetExists: { targetId: string }) => ({
    entry: entry({ id: "e-moved", date: "2026-07-15", spendingItemId: targetExists.targetId }),
    sourceItem: item({ spent: 0, entries: [] }),
    targetItem: item({
      id: targetExists.targetId,
      month: "2026-07",
      spent: 425,
      entries: [entry({ id: "e-moved", date: "2026-07-15", spendingItemId: targetExists.targetId })],
    }),
  });

  it("createEntry with a cross-month date inserts the target bucket and undoes the optimistic patch", async () => {
    vi.mocked(api.createEntry).mockResolvedValue(routedResult({ targetId: "s-jul" }));

    const { result } = renderHook(() => useSpending(data([item()])));

    await act(async () => {
      await result.current.createEntry(MONTH, "s1", { name: "Coffee", amount: 425, date: "2026-07-15" });
    });

    // Source item restored to the server copy — the optimistic spent bump is gone.
    expect(result.current.spendingData[MONTH][0].spent).toBe(0);
    expect(result.current.spendingData[MONTH][0].entries).toEqual([]);

    // Target month bucket did not exist locally; it is created with the item.
    expect(result.current.spendingData["2026-07"]).toHaveLength(1);
    expect(result.current.spendingData["2026-07"][0].spent).toBe(425);

    expect(toast.success).toHaveBeenCalledWith("Moved to July 2026");
  });

  it("updateEntry with a cross-month date updates an existing target bucket in place", async () => {
    const preexistingTarget = item({ id: "s-jul", month: "2026-07", spent: 0, entries: [] });
    vi.mocked(api.updateEntry).mockResolvedValue(routedResult({ targetId: "s-jul" }));

    const { result } = renderHook(() =>
      useSpending({ [MONTH]: [item({ entries: [entry()], spent: 425 })], "2026-07": [preexistingTarget] })
    );

    await act(async () => {
      await result.current.updateEntry(MONTH, "s1", "e1", { name: "Coffee", amount: 425, date: "2026-07-15" });
    });

    // The entry left the source item...
    expect(result.current.spendingData[MONTH][0].entries).toEqual([]);
    expect(result.current.spendingData[MONTH][0].spent).toBe(0);

    // ...and landed on the existing July incarnation (updated, not duplicated).
    expect(result.current.spendingData["2026-07"]).toHaveLength(1);
    expect(result.current.spendingData["2026-07"][0].spent).toBe(425);
    expect(result.current.spendingData["2026-07"][0].entries).toHaveLength(1);

    expect(toast.success).toHaveBeenCalledWith("Moved to July 2026");
  });
});

describe("useSpending — materializeMonth", () => {
  it("sets the returned bucket for a month with no local state yet", async () => {
    const materialized = [item({ id: "mat-1", month: "2026-07" })];
    vi.mocked(api.materializeMonth).mockResolvedValue(materialized);

    const { result } = renderHook(() => useSpending(data([item()])));

    await act(async () => {
      await result.current.materializeMonth("2026-07");
    });

    expect(api.materializeMonth).toHaveBeenCalledWith("2026-07");
    expect(result.current.spendingData["2026-07"]).toEqual(materialized);
    // Other months are untouched.
    expect(result.current.spendingData[MONTH]).toHaveLength(1);
  });

  it("replaces an existing bucket with the server's authoritative list", async () => {
    const existing = item();
    const materialized = [existing, item({ id: "mat-2", name: "Netflix" })];
    vi.mocked(api.materializeMonth).mockResolvedValue(materialized);

    const { result } = renderHook(() => useSpending(data([existing])));

    await act(async () => {
      await result.current.materializeMonth(MONTH);
    });

    expect(result.current.spendingData[MONTH]).toEqual(materialized);
  });

  it("leaves state untouched and stays silent on failure", async () => {
    vi.mocked(api.materializeMonth).mockRejectedValue(new Error("boom"));
    const before = [item()];

    const { result } = renderHook(() => useSpending(data(before)));

    await act(async () => {
      await result.current.materializeMonth("2026-07");
    });

    expect(result.current.spendingData["2026-07"]).toBeUndefined();
    expect(result.current.spendingData[MONTH]).toEqual(before);
    expect(showErrorToast).not.toHaveBeenCalled();
  });
});

describe("useSpending — category cascade mirrors (local state only)", () => {
  it("removeItemsByCategory drops the category's items across every loaded month", () => {
    const { result } = renderHook(() =>
      useSpending({
        "2026-05": [item({ id: "s1", month: "2026-05", categoryId: "c1" }), item({ id: "s2", month: "2026-05", categoryId: "c2" })],
        [MONTH]: [item({ id: "s3", categoryId: "c1" })],
      })
    );

    act(() => {
      result.current.removeItemsByCategory("c1");
    });

    expect(result.current.spendingData["2026-05"].map((i) => i.id)).toEqual(["s2"]);
    expect(result.current.spendingData[MONTH]).toEqual([]);
    expect(api.deleteSpending).not.toHaveBeenCalled();
    expect(api.getSpending).not.toHaveBeenCalled();
  });

  it("updateCategoryOnItems refreshes the embedded category snapshot everywhere", () => {
    const oldCat = { id: "c1", label: "Groceries", icon: "cart", color: "#34C759" };
    const { result } = renderHook(() =>
      useSpending({
        "2026-05": [item({ id: "s1", month: "2026-05", categoryId: "c1", category: oldCat })],
        [MONTH]: [
          item({ id: "s2", categoryId: "c1", category: oldCat }),
          item({ id: "s3", categoryId: "c2", category: { id: "c2", label: "Transport", icon: "car", color: "#007AFF" } }),
        ],
      })
    );

    const renamed = { id: "c1", label: "Food", icon: "fork", color: "#FF3B30" };

    act(() => {
      result.current.updateCategoryOnItems(renamed);
    });

    expect(result.current.spendingData["2026-05"][0].category).toEqual(renamed);
    expect(result.current.spendingData[MONTH][0].category).toEqual(renamed);
    // Other categories' items are untouched.
    expect(result.current.spendingData[MONTH][1].category?.label).toBe("Transport");
  });
});

describe("useSpending — receipt attach chain (create)", () => {
  const receiptFile = () => new File(["fake-jpeg-bytes"], "receipt.jpg", { type: "image/jpeg" });

  const stubHappyChain = (file: File) => {
    vi.mocked(api.createEntry).mockResolvedValue(entry({ id: "real" }));
    vi.mocked(api.issueReceiptUpload).mockResolvedValue({ path: "u1/real", token: "tok" });
    vi.mocked(uploadReceiptFile).mockResolvedValue(undefined);
    vi.mocked(api.confirmReceipt).mockResolvedValue({ receiptPath: "u1/real", receiptSizeBytes: file.size });
  };

  it("keeps the receipt off the POST body and runs issue → upload → confirm against the real id, then patches the entry", async () => {
    const file = receiptFile();
    stubHappyChain(file);

    const { result } = renderHook(() => useSpending(data([item()])));

    await act(async () => {
      await result.current.createEntry(MONTH, "s1", {
        name: "Coffee", amount: 425, date: "2026-06-02",
        receipt: { action: "attach", file },
      });
    });

    // The receipt never rides the entry POST body.
    expect(vi.mocked(api.createEntry).mock.calls[0][0]).not.toHaveProperty("receipt");

    // The confirmed receiptPath lands on the entry (patched by id).
    await waitFor(() => {
      expect(result.current.spendingData[MONTH][0].entries?.[0].receiptPath).toBe("u1/real");
    });

    // Every leg addresses the REAL id from the POST response, never the temp id.
    expect(api.issueReceiptUpload).toHaveBeenCalledWith("real", { sizeBytes: file.size });
    expect(uploadReceiptFile).toHaveBeenCalledWith("u1/real", "tok", file);
    expect(api.confirmReceipt).toHaveBeenCalledWith("real");

    // Strict ordering: entry POST, then issue → upload → confirm.
    const [postOrder] = vi.mocked(api.createEntry).mock.invocationCallOrder;
    const [issueOrder] = vi.mocked(api.issueReceiptUpload).mock.invocationCallOrder;
    const [uploadOrder] = vi.mocked(uploadReceiptFile).mock.invocationCallOrder;
    const [confirmOrder] = vi.mocked(api.confirmReceipt).mock.invocationCallOrder;

    expect(postOrder).toBeLessThan(issueOrder);

    expect(issueOrder).toBeLessThan(uploadOrder);

    expect(uploadOrder).toBeLessThan(confirmOrder);
  });

  it("keeps the created entry (no rollback) and toasts a retry when the upload leg fails", async () => {
    const file = receiptFile();

    vi.mocked(api.createEntry).mockResolvedValue(entry({ id: "real" }));
    vi.mocked(api.issueReceiptUpload).mockResolvedValue({ path: "u1/real", token: "tok" });
    vi.mocked(uploadReceiptFile).mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useSpending(data([item()])));

    await act(async () => {
      await result.current.createEntry(MONTH, "s1", {
        name: "Coffee", amount: 425, date: "2026-06-02",
        receipt: { action: "attach", file },
      });
    });

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith('Couldn\'t attach the receipt to "Coffee"', { retry: expect.any(Function) });
    });

    // The entry save already succeeded — it stays, just without a receipt.
    expect(result.current.spendingData[MONTH][0].entries?.[0].id).toBe("real");
    expect(result.current.spendingData[MONTH][0].entries?.[0].receiptPath).toBeNull();
    expect(api.confirmReceipt).not.toHaveBeenCalled();
  });

  it("treats quota_exceeded from confirm as terminal: specific toast, no retry toast", async () => {
    const file = receiptFile();

    vi.mocked(api.createEntry).mockResolvedValue(entry({ id: "real" }));
    vi.mocked(api.issueReceiptUpload).mockResolvedValue({ path: "u1/real", token: "tok" });
    vi.mocked(uploadReceiptFile).mockResolvedValue(undefined);
    vi.mocked(api.confirmReceipt).mockRejectedValue(new ApiError("quota_exceeded", 413));

    const { result } = renderHook(() => useSpending(data([item()])));

    await act(async () => {
      await result.current.createEntry(MONTH, "s1", {
        name: "Coffee", amount: 425, date: "2026-06-02",
        receipt: { action: "attach", file },
      });
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Receipt storage is full (50 MB). Delete some receipts first.");
    });

    // Terminal: the same file would fail again, so no retry is offered.
    expect(showErrorToast).not.toHaveBeenCalled();
    expect(result.current.spendingData[MONTH][0].entries?.[0].receiptPath).toBeNull();
  });

  it("merges a landed confirm patch over a stale materializeMonth response", async () => {
    const file = receiptFile();
    stubHappyChain(file);

    const { result } = renderHook(() => useSpending(data([item()])));

    await act(async () => {
      await result.current.createEntry(MONTH, "s1", {
        name: "Coffee", amount: 425, date: "2026-06-02",
        receipt: { action: "attach", file },
      });
    });

    await waitFor(() => {
      expect(result.current.spendingData[MONTH][0].entries?.[0].receiptPath).toBe("u1/real");
    });

    // A materialize response minted BEFORE the confirm landed still carries
    // receiptPath null — the wholesale bucket replacement must not revert it.
    const stale = [item({ entries: [entry({ id: "real", receiptPath: null })] })];
    vi.mocked(api.materializeMonth).mockResolvedValue(stale);

    await act(async () => {
      await result.current.materializeMonth(MONTH);
    });

    expect(result.current.spendingData[MONTH][0].entries?.[0].receiptPath).toBe("u1/real");
  });

  it("tracks the entry id in receiptUploads while the chain is in flight and clears it after", async () => {
    const file = receiptFile();

    vi.mocked(api.createEntry).mockResolvedValue(entry({ id: "real" }));
    vi.mocked(api.issueReceiptUpload).mockResolvedValue({ path: "u1/real", token: "tok" });
    vi.mocked(uploadReceiptFile).mockResolvedValue(undefined);

    let resolveConfirm!: (v: { receiptPath: string; receiptSizeBytes: number }) => void;
    vi.mocked(api.confirmReceipt).mockReturnValue(
      new Promise<{ receiptPath: string; receiptSizeBytes: number }>((r) => { resolveConfirm = r; }) as ReturnType<typeof api.confirmReceipt>
    );

    const { result } = renderHook(() => useSpending(data([item()])));

    await act(async () => {
      await result.current.createEntry(MONTH, "s1", {
        name: "Coffee", amount: 425, date: "2026-06-02",
        receipt: { action: "attach", file },
      });
    });

    // Chain parked on the pending confirm — the indicator is up.
    await waitFor(() => {
      expect(result.current.receiptUploads).toEqual({ real: "uploading" });
    });

    await act(async () => {
      resolveConfirm({ receiptPath: "u1/real", receiptSizeBytes: file.size });
    });

    await waitFor(() => {
      expect(result.current.receiptUploads).toEqual({});
    });
  });
});

describe("useSpending — receipt remove chain (update)", () => {
  it("keeps the receipt off the PUT body, calls deleteReceipt after it resolves, and nulls receiptPath", async () => {
    vi.mocked(api.updateEntry).mockResolvedValue(undefined);
    vi.mocked(api.deleteReceipt).mockResolvedValue(undefined);

    const withReceipt = entry({ receiptPath: "u1/e1" });
    const { result } = renderHook(() => useSpending(data([item({ spent: 425, entries: [withReceipt] })])));

    await act(async () => {
      await result.current.updateEntry(MONTH, "s1", "e1", {
        name: "Coffee", amount: 425, date: "2026-06-02",
        receipt: { action: "remove" },
      });
    });

    // The removal is its own chain, never an omitted JSON key on the PUT.
    expect(vi.mocked(api.updateEntry).mock.calls[0][1]).not.toHaveProperty("receipt");

    expect(api.deleteReceipt).toHaveBeenCalledWith("e1");

    const [putOrder] = vi.mocked(api.updateEntry).mock.invocationCallOrder;
    const [deleteOrder] = vi.mocked(api.deleteReceipt).mock.invocationCallOrder;

    expect(putOrder).toBeLessThan(deleteOrder);

    expect(result.current.spendingData[MONTH][0].entries?.[0].receiptPath).toBeNull();
  });

  it("restores receiptPath and toasts a retry when deleteReceipt fails", async () => {
    vi.mocked(api.updateEntry).mockResolvedValue(undefined);
    vi.mocked(api.deleteReceipt).mockRejectedValue(new Error("x"));

    const withReceipt = entry({ receiptPath: "u1/e1" });
    const { result } = renderHook(() => useSpending(data([item({ spent: 425, entries: [withReceipt] })])));

    await act(async () => {
      await result.current.updateEntry(MONTH, "s1", "e1", {
        name: "Coffee", amount: 425, date: "2026-06-02",
        receipt: { action: "remove" },
      });
    });

    await waitFor(() => {
      expect(result.current.spendingData[MONTH][0].entries?.[0].receiptPath).toBe("u1/e1");
    });

    expect(showErrorToast).toHaveBeenCalledWith('Couldn\'t remove the receipt from "Coffee"', { retry: expect.any(Function) });
  });
});

describe("useSpending — receipt resume markers (chain lifecycle)", () => {
  const receiptFile = () => new File(["fake-jpeg-bytes"], "receipt.jpg", { type: "image/jpeg" });

  it("arms the marker while the chain is in flight and clears it on success", async () => {
    const file = receiptFile();

    vi.mocked(api.createEntry).mockResolvedValue(entry({ id: "real" }));
    vi.mocked(api.issueReceiptUpload).mockResolvedValue({ path: "u1/real", token: "tok" });
    vi.mocked(uploadReceiptFile).mockResolvedValue(undefined);

    // Park the confirm so the in-flight window is observable.
    let releaseConfirm: (value: { receiptPath: string; receiptSizeBytes: number }) => void = () => undefined;

    vi.mocked(api.confirmReceipt).mockImplementation(() => new Promise((resolve) => { releaseConfirm = resolve; }));

    const { result } = renderHook(() => useSpending(data([item()])));

    await act(async () => {
      await result.current.createEntry(MONTH, "s1", {
        name: "Coffee", amount: 425, date: "2026-06-02",
        receipt: { action: "attach", file },
      });
    });

    await waitFor(() => {
      expect(localStorage.getItem(markerKey("real"))).not.toBeNull();
    });

    await act(async () => {
      releaseConfirm({ receiptPath: "u1/real", receiptSizeBytes: file.size });
    });

    await waitFor(() => {
      expect(localStorage.getItem(markerKey("real"))).toBeNull();
    });
  });

  it("clears the marker on a terminal failure and re-arms it when the retry replays the chain", async () => {
    const file = receiptFile();

    vi.mocked(api.createEntry).mockResolvedValue(entry({ id: "real" }));
    vi.mocked(api.issueReceiptUpload).mockResolvedValue({ path: "u1/real", token: "tok" });
    vi.mocked(uploadReceiptFile).mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useSpending(data([item()])));

    await act(async () => {
      await result.current.createEntry(MONTH, "s1", {
        name: "Coffee", amount: 425, date: "2026-06-02",
        receipt: { action: "attach", file },
      });
    });

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalled();
    });

    expect(localStorage.getItem(markerKey("real"))).toBeNull();

    // The retry closure replays uploadReceipt from the top — park the second
    // upload attempt to observe the re-armed marker.
    vi.mocked(uploadReceiptFile).mockImplementation(() => new Promise(() => undefined));

    const retry = vi.mocked(showErrorToast).mock.calls[0][1]?.retry;

    expect(retry).toBeDefined();

    await act(async () => {
      retry?.();
    });

    await waitFor(() => {
      expect(localStorage.getItem(markerKey("real"))).not.toBeNull();
    });
  });
});

describe("useSpending — receipt resume on mount", () => {
  it("confirms a pending marker, patches the entry, and clears the marker", async () => {
    addPendingReceipt("e1", "Coffee");

    vi.mocked(api.confirmReceipt).mockResolvedValue({ receiptPath: "u1/e1", receiptSizeBytes: 99 });

    const { result } = renderHook(() => useSpending(data([item({ entries: [entry()] })])));

    await waitFor(() => {
      expect(result.current.spendingData[MONTH][0].entries?.[0].receiptPath).toBe("u1/e1");
    });

    expect(api.confirmReceipt).toHaveBeenCalledWith("e1");
    expect(localStorage.getItem(markerKey("e1"))).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("toasts the re-attach message and clears the marker on 409 receipt_not_uploaded", async () => {
    addPendingReceipt("e1", "Coffee");

    vi.mocked(api.confirmReceipt).mockRejectedValue(new ApiError("receipt_not_uploaded", 409));

    renderHook(() => useSpending(data([item({ entries: [entry()] })])));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('The receipt for "Coffee" didn\'t finish uploading. Open the entry to attach it again.');
    });

    expect(localStorage.getItem(markerKey("e1"))).toBeNull();
  });

  it("clears silently when the entry is gone (404)", async () => {
    addPendingReceipt("e1", "Coffee");

    vi.mocked(api.confirmReceipt).mockRejectedValue(new ApiError("Entry not found", 404));

    renderHook(() => useSpending(data([item()])));

    await waitFor(() => {
      expect(localStorage.getItem(markerKey("e1"))).toBeNull();
    });

    expect(toast.error).not.toHaveBeenCalled();
  });

  it("keeps the marker on a network failure", async () => {
    addPendingReceipt("e1", "Coffee");

    vi.mocked(api.confirmReceipt).mockRejectedValue(new Error("network down"));

    renderHook(() => useSpending(data([item()])));

    await waitFor(() => {
      expect(api.confirmReceipt).toHaveBeenCalledTimes(1);
    });

    expect(localStorage.getItem(markerKey("e1"))).not.toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("keeps the marker on 401 (token-refresh race at mount)", async () => {
    addPendingReceipt("e1", "Coffee");

    vi.mocked(api.confirmReceipt).mockRejectedValue(new ApiError("Unauthorized", 401));

    renderHook(() => useSpending(data([item()])));

    await waitFor(() => {
      expect(api.confirmReceipt).toHaveBeenCalledTimes(1);
    });

    expect(localStorage.getItem(markerKey("e1"))).not.toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("prunes an expired marker without calling confirm", async () => {
    localStorage.setItem(
      markerKey("stale"),
      JSON.stringify({ entryId: "stale", entryName: "Old", startedAt: Date.now() - 86_400_000 - 1_000 })
    );

    renderHook(() => useSpending(data([item()])));

    await waitFor(() => {
      expect(localStorage.getItem(markerKey("stale"))).toBeNull();
    });

    expect(api.confirmReceipt).not.toHaveBeenCalled();
  });

  it("does nothing when no markers exist", async () => {
    renderHook(() => useSpending(data([item()])));

    await act(async () => undefined);

    expect(api.confirmReceipt).not.toHaveBeenCalled();
  });

  it("runs the resume exactly once under StrictMode double-effects", async () => {
    addPendingReceipt("e1", "Coffee");

    vi.mocked(api.confirmReceipt).mockResolvedValue({ receiptPath: "u1/e1", receiptSizeBytes: 99 });

    renderHook(() => useSpending(data([item({ entries: [entry()] })])), { wrapper: StrictMode });

    await waitFor(() => {
      expect(localStorage.getItem(markerKey("e1"))).toBeNull();
    });

    expect(api.confirmReceipt).toHaveBeenCalledTimes(1);
  });
});
