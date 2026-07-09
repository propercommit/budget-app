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
  getSeries: vi.fn().mockResolvedValue([]),
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
import type { Category } from "@/lib/types";

// jsdom lacks ResizeObserver, which children observe on mount.
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const MONTH = "2026-06";

function renderDashboard(categories: Category[]) {
  render(
    <SettingsProvider>
      <Dashboard
        initialCategories={categories}
        initialSpendingData={{}}
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

describe("Dashboard — starter chips (guided step 2)", () => {
  it("creates a missing category, then opens the spending popin with it preselected", async () => {
    vi.mocked(api.createCategory).mockResolvedValue({ id: "cat-housing", label: "Housing", icon: "home", color: "#f59e0b" });

    renderDashboard([]);

    fireEvent.click(screen.getByRole("button", { name: "Housing" }));

    await waitFor(() => expect(api.createCategory).toHaveBeenCalledWith({ label: "Housing", icon: "home", color: "#f59e0b" }));

    await waitFor(() => expect(screen.getByText("New Spending Item")).toBeInTheDocument());

    expect(screen.getByRole("radio", { name: "Housing" })).toHaveAttribute("aria-checked", "true");
  });

  it("reuses an existing category (case-insensitive) untouched and preselects the user's label", async () => {
    const existing: Category = { id: "cat-housing", label: "housing", icon: "shopping-cart", color: "#FF3B30" };

    renderDashboard([existing]);

    fireEvent.click(screen.getByRole("button", { name: "Housing" }));

    await waitFor(() => expect(screen.getByText("New Spending Item")).toBeInTheDocument());

    expect(api.createCategory).not.toHaveBeenCalled();

    expect(screen.getByRole("radio", { name: "housing" })).toHaveAttribute("aria-checked", "true");
  });

  it("does not open the popin when the category create fails", async () => {
    vi.mocked(api.createCategory).mockRejectedValue(new Error("offline"));

    renderDashboard([]);

    fireEvent.click(screen.getByRole("button", { name: "Housing" }));

    await waitFor(() => expect(showErrorToast).toHaveBeenCalled());

    expect(screen.queryByText("New Spending Item")).toBeNull();
  });
});
