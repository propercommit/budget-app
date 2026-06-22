// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/lib/api", () => ({
  getIncomeSources: vi.fn(),
  getAllIncomeSources: vi.fn(),
  createIncomeSource: vi.fn(),
  updateIncomeSource: vi.fn(),
  deleteIncomeSource: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

import { useIncome } from "@/components/hooks/use-income";
import * as api from "@/lib/api";
import toast from "react-hot-toast";
import type { IncomeSource } from "@/lib/types";

const income = (over: Partial<IncomeSource> = {}): IncomeSource => ({
  id: "i1",
  name: "Salary",
  amount: 5000,
  icon: "briefcase",
  type: "active",
  startDate: new Date("2026-06-01T00:00:00.000Z"),
  endDate: undefined,
  note: undefined,
  month: "2026-06",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  // createIncome / updateIncome refresh allIncomeSources after the mutation.
  vi.mocked(api.getAllIncomeSources).mockResolvedValue([]);
});

describe("useIncome — initial state", () => {
  it("hydrates from initial props and skips fetching", () => {
    const monthly = [income()];
    const all = [income(), income({ id: "i2", month: "2026-05" })];
    const { result } = renderHook(() => useIncome("2026-06", monthly, all));

    expect(result.current.incomeSources).toEqual(monthly);
    expect(result.current.allIncomeSources).toEqual(all);
    expect(result.current.isLoading).toBe(false);
    expect(api.getIncomeSources).not.toHaveBeenCalled();
  });
});

describe("useIncome — create (optimistic)", () => {
  it("shows a temp item immediately and replaces it with the server record on success", async () => {
    const server = income({ id: "server" });
    let resolve!: (v: IncomeSource) => void;
    vi.mocked(api.createIncomeSource).mockReturnValue(
      new Promise<IncomeSource>((r) => { resolve = r; }) as ReturnType<typeof api.createIncomeSource>
    );

    const { result } = renderHook(() => useIncome("2026-06", [], []));

    const { id: _id, month: _month, ...data } = income();
    let pending!: Promise<IncomeSource | null>;
    act(() => {
      pending = result.current.createIncome("2026-06", data);
    });

    expect(result.current.incomeSources).toHaveLength(1);
    expect(result.current.incomeSources[0].id).toMatch(/^temp-/);

    await act(async () => {
      resolve(server);
      await pending;
    });

    expect(result.current.incomeSources).toEqual([server]);
    // Dates are serialized to ISO strings when crossing the API boundary.
    expect(api.createIncomeSource).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: "2026-06-01T00:00:00.000Z",
        month: "2026-06",
      })
    );
    expect(api.getAllIncomeSources).toHaveBeenCalled();
  });

  it("rolls back and toasts on failure", async () => {
    vi.mocked(api.createIncomeSource).mockRejectedValue(new Error("x"));
    const { result } = renderHook(() => useIncome("2026-06", [], []));

    const { id: _id, month: _month, ...data } = income();
    let returned: IncomeSource | null = income();
    await act(async () => {
      returned = await result.current.createIncome("2026-06", data);
    });

    expect(returned).toBeNull();
    expect(result.current.incomeSources).toEqual([]);
    expect(toast.error).toHaveBeenCalledWith("Failed to create income source");
  });
});

describe("useIncome — update (optimistic)", () => {
  it("optimistically edits then swaps in the server response", async () => {
    const updated = income({ amount: 6000 });
    vi.mocked(api.updateIncomeSource).mockResolvedValue(updated);
    const { result } = renderHook(() => useIncome("2026-06", [income()], [income()]));

    const { id: _id, month: _month, ...data } = income({ amount: 6000 });
    await act(async () => {
      await result.current.updateIncome("i1", data);
    });

    expect(result.current.incomeSources[0]).toEqual(updated);
  });

  it("rolls back to original on failure", async () => {
    vi.mocked(api.updateIncomeSource).mockRejectedValue(new Error("x"));
    const original = income();
    const { result } = renderHook(() => useIncome("2026-06", [original], [original]));

    const { id: _id, month: _month, ...data } = income({ amount: 9999 });
    await act(async () => {
      await result.current.updateIncome("i1", data);
    });

    expect(result.current.incomeSources[0]).toEqual(original);
    expect(toast.error).toHaveBeenCalledWith("Failed to update income source");
  });
});

describe("useIncome — delete (optimistic)", () => {
  it("removes from both monthly and all lists, staying removed on success", async () => {
    vi.mocked(api.deleteIncomeSource).mockResolvedValue(undefined);
    const item = income();
    const { result } = renderHook(() => useIncome("2026-06", [item], [item]));

    let ok = false;
    await act(async () => {
      ok = await result.current.deleteIncome("i1");
    });

    expect(ok).toBe(true);
    expect(result.current.incomeSources).toEqual([]);
    expect(result.current.allIncomeSources).toEqual([]);
  });

  it("re-inserts into both lists and toasts on failure", async () => {
    vi.mocked(api.deleteIncomeSource).mockRejectedValue(new Error("x"));
    const item = income();
    const { result } = renderHook(() => useIncome("2026-06", [item], [item]));

    let ok = true;
    await act(async () => {
      ok = await result.current.deleteIncome("i1");
    });

    expect(ok).toBe(false);
    expect(result.current.incomeSources).toEqual([item]);
    expect(result.current.allIncomeSources).toEqual([item]);
    expect(toast.error).toHaveBeenCalledWith("Failed to delete income source");
  });
});

describe("useIncome — loadMonth", () => {
  it("copies the current sources into a new empty month", async () => {
    vi.mocked(api.getIncomeSources).mockResolvedValue([]); // target month is empty
    const copied = income({ id: "copied", month: "2026-07" });
    vi.mocked(api.createIncomeSource).mockResolvedValue(copied);

    const { result } = renderHook(() => useIncome("2026-06", [income()], [income()]));

    await act(async () => {
      await result.current.loadMonth("2026-07");
    });

    expect(api.createIncomeSource).toHaveBeenCalledWith(
      expect.objectContaining({ month: "2026-07" })
    );
    expect(result.current.incomeSources).toEqual([copied]);
  });

  it("uses the target month's own sources when it already has some", async () => {
    const existing = income({ id: "existing", month: "2026-07" });
    vi.mocked(api.getIncomeSources).mockResolvedValue([existing]);

    const { result } = renderHook(() => useIncome("2026-06", [income()], [income()]));

    await act(async () => {
      await result.current.loadMonth("2026-07");
    });

    expect(api.createIncomeSource).not.toHaveBeenCalled();
    expect(result.current.incomeSources).toEqual([existing]);
  });
});
