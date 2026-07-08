// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

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
  seriesId: "series-1",
  name: "Groceries",
  icon: "cart",
  recurring: true,
  budgeted: 100,
  spent: 0,
  month: "2026-06",
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

/** The expanded "Spending by Category" tile — the heading's parent wraps the donut and legend rows. */
function getLegend(): HTMLElement {
  return screen.getByText("Spending by Category").parentElement as HTMLElement;
}

/** A legend row (hover target) by its category name. */
function getLegendRow(name: string): HTMLElement {
  return within(getLegend()).getByText(name).parentElement as HTMLElement;
}

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

    // Donut svg = 1 track circle + 1 segment (Food), rendered twice (one ring
    // per breakpoint variant). The negative category never becomes a slice.
    expect(container.querySelectorAll("circle")).toHaveLength(4);

    // The legend share appears on hover and divides by the positive-slice
    // total the ring uses — Food is the whole ring, so its share reads 100%
    // (dividing by the net 40 would print a nonsensical 300% beside a full
    // circle). One readout per breakpoint ring.
    fireEvent.mouseEnter(getLegendRow("Food"));

    expect(screen.getAllByText("100%")).toHaveLength(2);

    // The unfiltered "Category Budgets" list still shows the refund category,
    // with its bar clamped to 0% (geometry only — the data stays negative).
    const budgets = screen.getByText("Category Budgets").parentElement as HTMLElement;
    const barWidths = Array.from(budgets.querySelectorAll<HTMLElement>('div[style*="width"]'))
      .map((bar) => bar.style.width)
      .filter((width) => width.endsWith("%"));

    expect(barWidths).toEqual(["60%", "0%"]);
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

  it("renders the over-budget chip inline, immediately before the amounts", () => {
    renderCard({
      totalIncome: 2000,
      categories: [cat({ label: "Food" })],
      spendingItems: [item({ spent: 234, budgeted: 200, category: cat({ label: "Food" }) })],
    });

    fireEvent.click(screen.getByText("Budget Overview"));

    // 34c over -> "+0.34 $", sitting in the header line right before the
    // "spent / budget" amounts (not trailing the row after the bar).
    const chip = screen.getByText("+0.34 $");
    const amounts = screen.getByText("2.34 $ / 2 $");

    expect(chip.nextElementSibling).toBe(amounts);
  });

  it("sorts the Category Budgets rows by budget usage, highest first", () => {
    // Input order is shuffled (20%, 100%, 80%) on purpose.
    renderCard({
      totalIncome: 5000,
      categories: [cat({ label: "Light" }), cat({ label: "Full" }), cat({ label: "Most" })],
      spendingItems: [
        item({ id: "l1", spent: 40, budgeted: 200, category: cat({ label: "Light" }) }),
        item({ id: "f1", spent: 200, budgeted: 200, category: cat({ label: "Full" }) }),
        item({ id: "m1", spent: 160, budgeted: 200, category: cat({ label: "Most" }) }),
      ],
    });

    fireEvent.click(screen.getByText("Budget Overview"));

    // Scope to the Category Budgets section — the donut legend above lists
    // the same names in its own (unsorted) order.
    const section = screen.getByText("Category Budgets").parentElement as HTMLElement;
    const names = within(section).getAllByText(/^(Light|Full|Most)$/).map((el) => el.textContent);

    expect(names).toEqual(["Full", "Most", "Light"]);
  });

  it("sorts the donut legend by spent, highest first", () => {
    // Input order is shuffled (40, 200, 160) on purpose.
    renderCard({
      totalIncome: 5000,
      categories: [cat({ label: "Low" }), cat({ label: "High" }), cat({ label: "Mid" })],
      spendingItems: [
        item({ id: "l1", spent: 40, budgeted: 400, category: cat({ label: "Low" }) }),
        item({ id: "h1", spent: 200, budgeted: 400, category: cat({ label: "High" }) }),
        item({ id: "m1", spent: 160, budgeted: 400, category: cat({ label: "Mid" }) }),
      ],
    });

    fireEvent.click(screen.getByText("Budget Overview"));

    // Scope to the donut legend — the Category Budgets section below lists the
    // same names in its own (usage-sorted) order.
    const names = within(getLegend()).getAllByText(/^(Low|High|Mid)$/).map((el) => el.textContent);

    expect(names).toEqual(["High", "Mid", "Low"]);
  });

  it("reveals a category's share on legend hover and dims the other rows", () => {
    renderCard({
      totalIncome: 2000,
      categories: [cat({ label: "Food" }), cat({ label: "Travel", color: "#007AFF" })],
      spendingItems: [
        item({ id: "f1", spent: 300, budgeted: 400, category: cat({ label: "Food" }) }),
        item({ id: "t1", spent: 100, budgeted: 400, category: cat({ label: "Travel" }) }),
      ],
    });

    fireEvent.click(screen.getByText("Budget Overview"));

    // No share readout until a category is hovered.
    expect(screen.queryByText("75%")).not.toBeInTheDocument();

    const foodRow = getLegendRow("Food");
    const travelRow = getLegendRow("Travel");

    fireEvent.mouseEnter(foodRow);

    // Food is 300 of the 400 positive total -> 75%, one readout per
    // breakpoint ring; the non-hovered row dims, the hovered one does not.
    expect(screen.getAllByText("75%")).toHaveLength(2);
    expect(travelRow.style.opacity).toBe("0.4");
    expect(foodRow.style.opacity).toBe("1");

    fireEvent.mouseLeave(foodRow);

    expect(screen.queryByText("75%")).not.toBeInTheDocument();
  });
});
