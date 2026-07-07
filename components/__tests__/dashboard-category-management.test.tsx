// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock the full client -> /api boundary; the SettingsProvider stays offline
// and falls back to defaults, everything else is asserted per test.
vi.mock("@/lib/api", () => ({
  getSettings: vi.fn().mockRejectedValue(new Error("offline")),
  updateSettings: vi.fn(),
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  getSpending: vi.fn(),
  createSpending: vi.fn(),
  updateSpending: vi.fn(),
  deleteSpending: vi.fn(),
  // Fires on Dashboard mount; rejecting keeps the initial bucket untouched
  // (the hook swallows materialize failures by design).
  materializeMonth: vi.fn().mockRejectedValue(new Error("offline")),
  getIncomeSources: vi.fn(),
  getAllIncomeSources: vi.fn(),
  createIncomeSource: vi.fn(),
  updateIncomeSource: vi.fn(),
  deleteIncomeSource: vi.fn(),
  getEntries: vi.fn(),
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/toast", () => ({
  showErrorToast: vi.fn(),
}));

// The Header runs its own supabase.auth.getUser() on mount.
vi.mock("@/lib/supabase", () => ({
  createClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { Dashboard } from "@/components/dashboard";
import { SettingsProvider } from "@/lib/settings-context";
import * as api from "@/lib/api";
import { showErrorToast } from "@/lib/toast";
import type { Category, SpendingItem } from "@/lib/types";

// jsdom lacks ResizeObserver, which children observe on mount.
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const MONTH = "2026-06";

const groceries: Category = { id: "cat-groceries", label: "Groceries", icon: "shopping-cart", color: "#34C759" };
const transport: Category = { id: "cat-transport", label: "Transport", icon: "car", color: "#007AFF" };

const item = (over: Partial<SpendingItem> & Pick<SpendingItem, "id" | "name" | "categoryId" | "category">): SpendingItem => ({
  seriesId: `series-${over.id}`,
  icon: "shopping-cart",
  recurring: true,
  budgeted: 20000,
  spent: 0,
  month: MONTH,
  startDate: `${MONTH}-01`,
  endDate: null,
  note: null,
  entries: [],
  ...over,
});

const weeklyShop = item({ id: "s1", name: "Weekly shop", categoryId: groceries.id, category: groceries });
const busPass = item({ id: "s2", name: "Bus pass", categoryId: transport.id, category: transport });

function renderDashboard() {
  render(
    <SettingsProvider>
      <Dashboard
        initialCategories={[groceries, transport]}
        initialSpendingData={{ [MONTH]: [weeklyShop, busPass] }}
        initialIncomeSources={[]}
        initialAllIncomeSources={[]}
        initialMonth={MONTH}
      />
    </SettingsProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Dashboard — category management wiring", () => {
  it("deleting the selected category resets the filter and drops its items from spending state", async () => {
    vi.mocked(api.deleteCategory).mockResolvedValue({ success: true });
    renderDashboard();

    // Filter down to Groceries via its ribbon pill (the ribbon renders both
    // its responsive rows in jsdom, so pill queries use getAllByRole).
    fireEvent.click(screen.getAllByRole("button", { name: "Groceries" })[0]);

    expect(screen.getByText("Weekly shop")).toBeDefined();
    expect(screen.queryByText("Bus pass")).toBeNull();

    // Manage -> row Delete -> centered confirmation naming the category.
    fireEvent.click(screen.getByRole("button", { name: "Manage" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Groceries" }));

    expect(screen.getByText('Delete "Groceries"?')).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(api.deleteCategory).toHaveBeenCalledWith(groceries.id));

    // Filter reset to "all": the surviving category's items are visible again,
    // the deleted category's items are gone (client-side cascade mirror).
    await waitFor(() => expect(screen.getByText("Bus pass")).toBeDefined());
    expect(screen.queryByText("Weekly shop")).toBeNull();

    // Dialog closed; the deleted category left the ribbon and the manage list.
    expect(screen.queryByText('Delete "Groceries"?')).toBeNull();
    expect(screen.queryAllByRole("button", { name: "Groceries" })).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Delete Groceries" })).toBeNull();
  });

  it("a failed delete toasts, restores the row, and keeps the manage popin usable", async () => {
    vi.mocked(api.deleteCategory).mockRejectedValue(new Error("Failed to delete category"));
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "Manage" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Groceries" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(showErrorToast).toHaveBeenCalledWith("Failed to delete category", { retry: expect.any(Function) }));

    // Dialog closed, row rolled back, popin still searchable, items untouched.
    await waitFor(() => expect(screen.queryByText('Delete "Groceries"?')).toBeNull());
    expect(screen.getByRole("button", { name: "Delete Groceries" })).toBeDefined();
    expect(screen.getByPlaceholderText("Search categories")).toBeDefined();
    expect(screen.getByText("Weekly shop")).toBeDefined();
  });

  it("row Edit opens the category popin prefilled; saving remaps the label filter and item snapshots", async () => {
    vi.mocked(api.updateCategory).mockResolvedValue(undefined);
    renderDashboard();

    // Select Groceries, then rename it to Food from the manage popin.
    fireEvent.click(screen.getAllByRole("button", { name: "Groceries" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Manage" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit Groceries" }));

    expect(screen.getByText("Edit Category")).toBeDefined();

    const nameInput = screen.getByDisplayValue("Groceries");

    fireEvent.change(nameInput, { target: { value: "Food" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(api.updateCategory).toHaveBeenCalledWith(groceries.id, {
      label: "Food",
      icon: "shopping-cart",
      color: "#34C759",
    }));

    // The filter followed the rename (item still visible, not stranded), and
    // the renamed pill exists while the old label's pill is gone.
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Food" }).length).toBeGreaterThan(0));
    expect(screen.getByText("Weekly shop")).toBeDefined();
    expect(screen.queryAllByRole("button", { name: "Groceries" })).toHaveLength(0);
  });
});
