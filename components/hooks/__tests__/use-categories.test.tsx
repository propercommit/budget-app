// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Mock the only client -> /api boundary. Factories are hoisted, so declare the
// spies inside the factory and re-grab them via the imported module below.
vi.mock("@/lib/api", () => ({
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

import { useCategories } from "@/components/hooks/use-categories";
import * as api from "@/lib/api";
import toast from "react-hot-toast";
import type { Category } from "@/lib/types";

const cat = (over: Partial<Category> = {}): Category => ({
  id: "c1",
  label: "Groceries",
  icon: "cart",
  color: "#34C759",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useCategories — initial state", () => {
  it("hydrates from initialCategories and does not fetch", () => {
    const initial = [cat()];
    const { result } = renderHook(() => useCategories(initial));

    expect(result.current.categories).toEqual(initial);
    expect(result.current.isLoading).toBe(false);
    expect(api.getCategories).not.toHaveBeenCalled();
  });

  it("fetches on mount when no initial data is provided", async () => {
    vi.mocked(api.getCategories).mockResolvedValue([cat({ id: "fetched" })]);
    const { result } = renderHook(() => useCategories());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(api.getCategories).toHaveBeenCalledOnce();
    expect(result.current.categories).toEqual([cat({ id: "fetched" })]);
  });
});

describe("useCategories — create (optimistic)", () => {
  it("inserts a temp item immediately, then replaces it with the server record on success", async () => {
    const server = cat({ id: "server-id", label: "Rent" });
    let resolve!: (v: Category) => void;
    vi.mocked(api.createCategory).mockReturnValue(
      new Promise<Category>((r) => { resolve = r; }) as ReturnType<typeof api.createCategory>
    );

    const { result } = renderHook(() => useCategories([]));

    let pending!: Promise<Category | null>;
    act(() => {
      pending = result.current.addCategory("Rent", "home", "#007AFF");
    });

    // Optimistic temp item appears before the API resolves.
    expect(result.current.categories).toHaveLength(1);
    const optimistic = result.current.categories[0];
    expect(optimistic.id).toMatch(/^temp-/);
    expect(optimistic.label).toBe("Rent");

    await act(async () => {
      resolve(server);
      await pending;
    });

    // Temp item replaced in place by the server record.
    expect(result.current.categories).toEqual([server]);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("rolls back the temp item and fires an error toast when the API rejects", async () => {
    vi.mocked(api.createCategory).mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useCategories([]));

    let returned: Category | null = cat();
    await act(async () => {
      returned = await result.current.addCategory("Rent", "home", "#007AFF");
    });

    expect(result.current.categories).toEqual([]);
    expect(returned).toBeNull();
    // The rejection's message is surfaced (e.g. the friendly duplicate 409).
    expect(toast.error).toHaveBeenCalledWith("boom");
  });
});

describe("useCategories — update (optimistic)", () => {
  it("applies the optimistic edit and keeps it on success", async () => {
    vi.mocked(api.updateCategory).mockResolvedValue(undefined);
    const { result } = renderHook(() => useCategories([cat()]));

    let ok = false;
    await act(async () => {
      ok = await result.current.updateCategory("c1", "Food", "fork", "#FF3B30");
    });

    expect(ok).toBe(true);
    expect(result.current.categories[0]).toMatchObject({
      id: "c1",
      label: "Food",
      icon: "fork",
      color: "#FF3B30",
    });
    expect(api.updateCategory).toHaveBeenCalledWith("c1", {
      label: "Food",
      icon: "fork",
      color: "#FF3B30",
    });
  });

  it("restores the original on failure and surfaces the server message", async () => {
    vi.mocked(api.updateCategory).mockRejectedValue(new Error("A category with this name already exists"));
    const original = cat();
    const { result } = renderHook(() => useCategories([original]));

    let ok = true;
    await act(async () => {
      ok = await result.current.updateCategory("c1", "Food", "fork", "#FF3B30");
    });

    expect(ok).toBe(false);
    expect(result.current.categories[0]).toEqual(original);
    expect(toast.error).toHaveBeenCalledWith("A category with this name already exists");
  });

  it("falls back to a generic toast when the rejection has no message", async () => {
    vi.mocked(api.updateCategory).mockRejectedValue("kaboom");
    const { result } = renderHook(() => useCategories([cat()]));

    await act(async () => {
      await result.current.updateCategory("c1", "Food", "fork", "#FF3B30");
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to update category");
  });

  it("no-ops when the id is unknown", async () => {
    const { result } = renderHook(() => useCategories([cat()]));
    await act(async () => {
      await result.current.updateCategory("missing", "X", "x", "#000000");
    });
    expect(api.updateCategory).not.toHaveBeenCalled();
  });
});

describe("useCategories — delete (optimistic)", () => {
  it("removes immediately and stays removed on success", async () => {
    vi.mocked(api.deleteCategory).mockResolvedValue(undefined);
    const { result } = renderHook(() => useCategories([cat(), cat({ id: "c2" })]));

    let ok = false;
    await act(async () => {
      ok = await result.current.deleteCategory("c1");
    });

    expect(ok).toBe(true);
    expect(result.current.categories.map((c) => c.id)).toEqual(["c2"]);
  });

  it("re-inserts the removed item on failure and surfaces the server message", async () => {
    vi.mocked(api.deleteCategory).mockRejectedValue(new Error("Category not found"));
    const { result } = renderHook(() => useCategories([cat()]));

    let ok = true;
    await act(async () => {
      ok = await result.current.deleteCategory("c1");
    });

    expect(ok).toBe(false);
    expect(result.current.categories.map((c) => c.id)).toEqual(["c1"]);
    expect(toast.error).toHaveBeenCalledWith("Category not found");
  });
});
