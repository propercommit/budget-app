/**
 * Deterministic fixture data for visual-regression tests.
 *
 * Every value is fixed — months, dates, amounts, ids — so screenshots are
 * byte-stable across runs and never depend on the real current date. Amounts
 * are major-unit numbers (the same shape `app/page.tsx` hands to `<Dashboard>`);
 * `spent` on a spending item is always the exact sum of its entries so
 * component-level tests match what the server recomputes on load.
 *
 * The three months (April–June 2026) give trends and cross-month views real
 * data to draw, with a deliberate mix of under-budget, over-budget, and
 * no-spend items to exercise every card state.
 */
import type {
  Category,
  IncomeSource,
  SpendingEntry,
  SpendingItem,
} from "@/lib/types";

export const MONTHS = ["2026-04", "2026-05", "2026-06"] as const;

/** The month the Dashboard opens on in tests. */
export const SELECTED_MONTH = "2026-06";

export const categories: Category[] = [
  { id: "cat-groceries", icon: "shopping-cart", label: "Groceries", color: "#34C759" },
  { id: "cat-transport", icon: "car", label: "Transport", color: "#007AFF" },
  { id: "cat-dining", icon: "coffee", label: "Dining", color: "#FF9F0A" },
  { id: "cat-housing", icon: "home", label: "Housing", color: "#FF3B30" },
  { id: "cat-fun", icon: "film", label: "Entertainment", color: "#AF52DE" },
];

/** Sums entry amounts exactly so `spent` never drifts from the entry list. */
function sumEntries(entries: SpendingEntry[]): number {
  return entries.reduce((total, entry) => total + entry.amount, 0);
}

function entry(
  itemId: string,
  index: number,
  name: string,
  amount: number,
  date: string,
  extras: Partial<Pick<SpendingEntry, "receiptUrl" | "link">> = {},
): SpendingEntry {
  return {
    id: `${itemId}-e${index}`,
    name,
    amount,
    date,
    receiptUrl: extras.receiptUrl ?? null,
    link: extras.link ?? null,
    spendingItemId: itemId,
  };
}

function item(
  partial: Omit<SpendingItem, "spent" | "category" | "entries"> & {
    categoryId: string;
    entries: SpendingEntry[];
  },
): SpendingItem {
  const category = categories.find((c) => c.id === partial.categoryId);

  return {
    ...partial,
    category,
    spent: sumEntries(partial.entries),
  };
}

/** Spending items for one month, parameterised so each month differs slightly. */
function monthItems(month: string, scale: number): SpendingItem[] {
  const groceries = `groceries-${month}`;
  const transport = `transport-${month}`;
  const dining = `dining-${month}`;
  const housing = `housing-${month}`;

  return [
    item({
      id: groceries,
      name: "Groceries",
      icon: "shopping-cart",
      budgeted: 600,
      month,
      startDate: `${month}-01`,
      endDate: null,
      note: "Weekly supermarket runs",
      categoryId: "cat-groceries",
      entries: [
        entry(groceries, 1, "Migros", 84.2 + scale, `${month}-03`),
        entry(groceries, 2, "Coop", 52.75, `${month}-11`, {
          link: "https://example.com/receipt",
        }),
        entry(groceries, 3, "Farmers market", 31.5, `${month}-18`),
      ],
    }),
    item({
      id: transport,
      name: "Transport",
      icon: "car",
      budgeted: 200,
      month,
      startDate: `${month}-01`,
      endDate: null,
      note: null,
      categoryId: "cat-transport",
      entries: [
        entry(transport, 1, "Fuel", 78.4, `${month}-06`),
        entry(transport, 2, "Parking", 24.0, `${month}-20`),
      ],
    }),
    // Deliberately over budget to exercise the over-budget card state.
    item({
      id: dining,
      name: "Dining out",
      icon: "coffee",
      budgeted: 150,
      month,
      startDate: `${month}-01`,
      endDate: null,
      note: "Restaurants & cafés",
      categoryId: "cat-dining",
      entries: [
        entry(dining, 1, "Sushi bar", 96.0 + scale, `${month}-08`),
        entry(dining, 2, "Coffee", 42.5, `${month}-14`),
        entry(dining, 3, "Pizza night", 38.9, `${month}-25`),
      ],
    }),
    // No entries → no spend yet, full budget remaining.
    item({
      id: housing,
      name: "Home supplies",
      icon: "home",
      budgeted: 120,
      month,
      startDate: `${month}-01`,
      endDate: null,
      note: null,
      categoryId: "cat-housing",
      entries: [],
    }),
  ];
}

export const spendingData: Record<string, SpendingItem[]> = {
  "2026-04": monthItems("2026-04", 0),
  "2026-05": monthItems("2026-05", 20),
  "2026-06": monthItems("2026-06", 40),
};

function income(
  id: string,
  name: string,
  amount: number,
  icon: string,
  type: IncomeSource["type"],
  month: string,
  note?: string,
): IncomeSource {
  return {
    id,
    name,
    amount,
    icon,
    type,
    month,
    startDate: new Date(`${month}-01T00:00:00.000Z`),
    note,
  };
}

/** Income for the selected month only (what the income card renders). */
export const incomeSources: IncomeSource[] = [
  income("income-salary-2026-06", "Salary", 5200, "briefcase", "active", "2026-06", "Monthly net pay"),
  income("income-dividends-2026-06", "Dividends", 320, "trending-up", "passive", "2026-06"),
];

/** Income across all three months, driving the trends dataset. */
export const allIncomeSources: IncomeSource[] = [
  income("income-salary-2026-04", "Salary", 5000, "briefcase", "active", "2026-04"),
  income("income-salary-2026-05", "Salary", 5200, "briefcase", "active", "2026-05"),
  income("income-dividends-2026-05", "Dividends", 300, "trending-up", "passive", "2026-05"),
  ...incomeSources,
];

/** A single spending item (with entries) for feature-component tests. */
export const spendingItem: SpendingItem = spendingData["2026-06"][0];

/** A single income source for feature-component tests. */
export const incomeSource: IncomeSource = incomeSources[0];

/** A single category for feature-component tests. */
export const category: Category = categories[0];

/** Category shape (`{ name, icon, color }`) that card components expect. */
export const cardCategories = categories.map((c) => ({
  name: c.label,
  icon: c.icon,
  color: c.color,
}));
