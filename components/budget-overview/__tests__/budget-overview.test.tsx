// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// SettingsProvider calls getSettings() on mount; keep it offline so it falls
// back to the USD default ("<value> $").
vi.mock("@/lib/api", () => ({
  getSettings: vi.fn().mockRejectedValue(new Error("offline")),
  updateSettings: vi.fn(),
}));

import { SettingsProvider } from "@/lib/settings-context";
import { BudgetOverviewCard } from "@/components/budget-overview/budget-overview";
import type { Category } from "@/lib/category";
import type { SpendingItem } from "@/lib/types";

const cat = (over: Partial<Category> = {}): Category => ({
  label: "Food",
  icon: "fork",
  color: "#34C759",
  ...over,
});

const item = (over: Partial<SpendingItem> = {}): SpendingItem => ({
  id: "s1",
  name: "Groceries",
  icon: "cart",
  budgeted: 100,
  spent: 0,
  month: "2026-06",
  startDate: "2026-06-01",
  endDate: null,
  note: null,
  categoryId: "c1",
  ...over,
});

function renderCard(props: {
  totalIncome: number;
  categories: Category[];
  spendingItems: SpendingItem[];
}) {
  return render(
    <SettingsProvider>
      <BudgetOverviewCard {...props} />
    </SettingsProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BudgetOverviewCard — collapsed totals", () => {
  it("sums spent across items and shows the income remainder", () => {
    renderCard({
      totalIncome: 3000,
      categories: [cat()],
      spendingItems: [item({ spent: 500 }), item({ id: "s2", spent: 250 })],
    });
    // totalSpent = 750, remaining = 3000 - 750 = 2250.
    expect(screen.getByText("Remaining")).toBeInTheDocument();
    expect(screen.getByText("2,250 $")).toBeInTheDocument();
  });

  it("sums realistic decimal spends without float drift in the displayed total", () => {
    // 0.1 + 0.2 is the classic float case. remaining = 1000 - 0.3 = 999.7.
    renderCard({
      totalIncome: 1000,
      categories: [cat()],
      spendingItems: [item({ spent: 0.1 }), item({ id: "s2", spent: 0.2 })],
    });
    expect(screen.getByText("999.7 $")).toBeInTheDocument();
  });
});

describe("BudgetOverviewCard — expand toggle and category breakdown", () => {
  it("expands to show the per-category breakdown computed from items", () => {
    renderCard({
      totalIncome: 2000,
      categories: [cat({ label: "Food" }), cat({ label: "Travel", color: "#007AFF" })],
      spendingItems: [
        item({ id: "f1", spent: 120, budgeted: 200, category: cat({ label: "Food" }) }),
        item({ id: "t1", spent: 80, budgeted: 100, category: cat({ label: "Travel" }) }),
      ],
    });

    // Collapsed first; the expanded-only "Category Budgets" section is absent.
    expect(screen.queryByText("Category Budgets")).not.toBeInTheDocument();

    // Click the collapsed card to expand.
    fireEvent.click(screen.getByText("Budget Overview"));

    // Expanded view renders the breakdown sections and both category names.
    expect(screen.getByText("Spending by Category")).toBeInTheDocument();
    expect(screen.getByText("Category Budgets")).toBeInTheDocument();
    expect(screen.getAllByText("Food").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Travel").length).toBeGreaterThan(0);
  });

  it("attributes spend only to the matching category label", () => {
    renderCard({
      totalIncome: 1000,
      categories: [cat({ label: "Food" }), cat({ label: "Empty" })],
      spendingItems: [item({ spent: 300, budgeted: 300, category: cat({ label: "Food" }) })],
    });

    fireEvent.click(screen.getByText("Budget Overview"));

    // Food spend (300) shows; Empty has no items so it is filtered out of the
    // donut/legend (which only render cats with spent > 0).
    expect(screen.getAllByText("Food").length).toBeGreaterThan(0);
    expect(screen.queryByText("Empty")).not.toBeInTheDocument();
  });
});
