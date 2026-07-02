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
import type { Category, SpendingItem } from "@/lib/types";

// lib/types Category (with id) — structurally satisfies the card's looser
// lib/category prop type and matches what SpendingItem.category requires.
const cat = (over: Partial<Category> = {}): Category => ({
  id: "c1",
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
      totalIncome: 300_000,
      categories: [cat()],
      spendingItems: [item({ spent: 50_000 }), item({ id: "s2", spent: 25_000 })],
    });
    // totalSpent = 75_000c, remaining = 300_000 - 75_000 = 225_000c -> "2,250 $".
    expect(screen.getByText("Remaining")).toBeInTheDocument();
    expect(screen.getByText("2,250 $")).toBeInTheDocument();
  });

  it("sums realistic decimal spends without float drift in the displayed total", () => {
    // The classic 0.1 + 0.2 case, now integer cents: 10c + 20c = 30c exactly,
    // no IEEE-754 drift. remaining = 100_000c - 30c = 99_970c -> "999.7 $".
    renderCard({
      totalIncome: 100_000,
      categories: [cat()],
      spendingItems: [item({ spent: 10 }), item({ id: "s2", spent: 20 })],
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

describe("BudgetOverviewCard — net-credit categories (signed spent)", () => {
  it("excludes a negative-spent category from the donut and renders without error", () => {
    const { container } = renderCard({
      totalIncome: 2000,
      categories: [cat({ label: "Food" }), cat({ id: "c2", label: "Refunds", color: "#AF52DE" })],
      spendingItems: [
        item({ id: "f1", spent: 120, budgeted: 200, category: cat({ label: "Food" }) }),
        // Refund month: the category's net spent is negative — valid data.
        item({ id: "r1", spent: -80, budgeted: 100, category: cat({ id: "c2", label: "Refunds" }) }),
      ],
    });

    fireEvent.click(screen.getByText("Budget Overview"));

    // Donut svg = 1 track circle + 1 segment (Food). The negative category
    // never becomes a slice.
    expect(container.querySelectorAll("circle")).toHaveLength(2);

    // Legend share divides by the positive-slice total the ring uses — Food is
    // the whole ring, so its share reads 100% (dividing by the net 40 would
    // print a nonsensical 300% beside a full circle).
    expect(screen.getByText("100%")).toBeInTheDocument();

    // The unfiltered "Category Budgets" list still shows the refund category,
    // with its bar clamped to 0% (geometry only — the data stays negative).
    const categoryBars = container.querySelectorAll<HTMLElement>(".h-1\\.5 > div");

    expect(Array.from(categoryBars).map((bar) => bar.style.width)).toEqual(["60%", "0%"]);
  });

  it("omits the donut and clamps every bar to 0% when all categories are net-negative", () => {
    const { container } = renderCard({
      totalIncome: 2000,
      categories: [cat({ label: "Refunds" })],
      spendingItems: [item({ id: "r1", spent: -150, budgeted: 100, category: cat({ label: "Refunds" }) })],
    });

    fireEvent.click(screen.getByText("Budget Overview"));

    // No positive slice → the donut block is skipped entirely, no svg circles.
    expect(container.querySelectorAll("circle")).toHaveLength(0);

    // Every percentage-width bar (income-used, budget-used, category row)
    // clamps to 0 width instead of emitting invalid negative CSS.
    const widths = Array.from(container.querySelectorAll<HTMLElement>('div[style*="width"]'))
      .map((el) => el.style.width)
      .filter((width) => width.endsWith("%"));

    expect(widths.length).toBeGreaterThan(0);

    for (const width of widths) expect(width).toBe("0%");
  });
});
