/**
 * Deterministic fixture data for visual-regression tests.
 *
 * Every value is fixed — months, dates, amounts, ids — so screenshots are
 * byte-stable across runs and never depend on the real current date. Money is
 * stored as integer cents (the app's unit; components divide by 100 only at the
 * display edge) — written major-unit via the `cents()` helper for legibility.
 * `spent` on a spending item is always the exact sum of its entries so
 * component-level tests match what the server recomputes on load.
 *
 * The three months (April–June 2026) give trends and cross-month views real
 * data to draw, with a deliberate mix of under-budget, over-budget, and
 * no-spend items to exercise every card state.
 */
import type {
  BudgetSeriesSummary,
  Category,
  IncomeSource,
  SpendingEntry,
  SpendingItem,
} from "@/lib/types";
import { applyEntry } from "@/lib/spending/math";

/** The month the Dashboard opens on in tests. */
export const SELECTED_MONTH = "2026-06";

/** No-op callback for the many handler props that visual tests never fire. */
export const noop = () => {};

/**
 * Convert a readable major-unit amount to the integer cents the app now uses
 * everywhere (components divide by 100 only at the display edge via
 * `formatAmount`). Written major-unit in the fixtures for legibility, stored as
 * cents so screenshots render the intended values.
 */
export const cents = (major: number) => Math.round(major * 100);

export const categories: Category[] = [
  { id: "cat-groceries", icon: "shopping-cart", label: "Groceries", color: "#34C759" },
  { id: "cat-transport", icon: "car", label: "Transport", color: "#007AFF" },
  { id: "cat-dining", icon: "coffee", label: "Dining", color: "#FF9F0A" },
  { id: "cat-housing", icon: "home", label: "Housing", color: "#FF3B30" },
  { id: "cat-fun", icon: "film", label: "Entertainment", color: "#AF52DE" },
];

/** Derives `spent` from the entries via the shared signed-sum rule so it never drifts from the entry list. */
function sumEntries(entries: SpendingEntry[]): number {
  return entries.reduce((total, entry) => applyEntry(total, entry), 0);
}

function entry(
  itemId: string,
  index: number,
  name: string,
  amount: number,
  date: string,
  extras: Partial<Pick<SpendingEntry, "link" | "direction">> = {},
): SpendingEntry {
  return {
    id: `${itemId}-e${index}`,
    name,
    amount,
    direction: extras.direction ?? "debit",
    date,
    receiptUrl: null,
    link: extras.link ?? null,
    spendingItemId: itemId,
  };
}

function item(
  partial: Omit<SpendingItem, "spent" | "category" | "entries" | "recurring"> & {
    categoryId: string;
    entries: SpendingEntry[];
  },
): SpendingItem {
  const category = categories.find((c) => c.id === partial.categoryId);

  return {
    ...partial,
    recurring: true,
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
      seriesId: "series-groceries",
      name: "Groceries",
      icon: "shopping-cart",
      budgeted: cents(600),
      month,
      note: "Weekly supermarket runs",
      categoryId: "cat-groceries",
      entries: [
        entry(groceries, 1, "Migros", cents(84.2 + scale), `${month}-03`),
        entry(groceries, 2, "Coop", cents(52.75), `${month}-11`, {
          link: "https://example.com/receipt",
        }),
        entry(groceries, 3, "Farmers market", cents(31.5), `${month}-18`),
      ],
    }),
    item({
      id: transport,
      seriesId: "series-transport",
      name: "Transport",
      icon: "car",
      budgeted: cents(200),
      month,
      note: null,
      categoryId: "cat-transport",
      entries: [
        entry(transport, 1, "Fuel", cents(78.4), `${month}-06`),
        entry(transport, 2, "Parking", cents(24.0), `${month}-20`),
      ],
    }),
    // Deliberately over budget to exercise the over-budget card state.
    item({
      id: dining,
      seriesId: "series-dining",
      name: "Dining out",
      icon: "coffee",
      budgeted: cents(150),
      month,
      note: "Restaurants & cafés",
      categoryId: "cat-dining",
      entries: [
        entry(dining, 1, "Sushi bar", cents(96.0 + scale), `${month}-08`),
        entry(dining, 2, "Coffee", cents(42.5), `${month}-14`),
        entry(dining, 3, "Pizza night", cents(38.9), `${month}-25`),
      ],
    }),
    // No entries → no spend yet, full budget remaining.
    item({
      id: housing,
      seriesId: "series-housing",
      name: "Home supplies",
      icon: "home",
      budgeted: cents(120),
      month,
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
  income("income-salary-2026-06", "Salary", cents(5200), "briefcase", "active", "2026-06", "Monthly net pay"),
  income("income-dividends-2026-06", "Dividends", cents(320), "trending-up", "passive", "2026-06"),
];

/** Income across all three months, driving the trends dataset. */
export const allIncomeSources: IncomeSource[] = [
  income("income-salary-2026-04", "Salary", cents(5000), "briefcase", "active", "2026-04"),
  income("income-salary-2026-05", "Salary", cents(5200), "briefcase", "active", "2026-05"),
  income("income-dividends-2026-05", "Dividends", cents(300), "trending-up", "passive", "2026-05"),
  ...incomeSources,
];

/** A single income source for feature-component tests. */
export const incomeSource: IncomeSource = incomeSources[0];

/**
 * Series list for the create popin's typeahead specs: one dormant series
 * (Resume row) and one active in {@link SELECTED_MONTH} (disabled row); both
 * match a "net" query so a single screenshot exercises every row state.
 */
export const seriesOptions: BudgetSeriesSummary[] = [
  {
    id: "ser-netflix",
    name: "Netflix",
    icon: "film",
    categoryId: "cat-fun",
    categoryLabel: "Entertainment",
    categoryColor: "#AF52DE",
    recurring: true,
    firstActiveMonth: "2025-01",
    lastActiveMonth: "2025-05",
    lastBudgeted: cents(18.9),
  },
  {
    id: "ser-internet",
    name: "Internet",
    icon: "home",
    categoryId: "cat-housing",
    categoryLabel: "Housing",
    categoryColor: "#FF3B30",
    recurring: true,
    firstActiveMonth: "2026-01",
    lastActiveMonth: SELECTED_MONTH,
    lastBudgeted: cents(49),
  },
];

/** Category shape (`{ name, icon, color }`) that card components expect. */
export const cardCategories = categories.map((c) => ({
  name: c.label,
  icon: c.icon,
  color: c.color,
}));

/** Baseline SpendingCard props shared by the card specs — spread and override per test (entries stay per-spec). */
export const baseCardProps = {
  spendingName: "Groceries",
  spendingItemIcon: "shopping-cart",
  categoryName: "Groceries",
  spendingCategoryColor: "#34C759",
  budgetNumber: cents(600),
  categories: cardCategories,
  onItemUpdate: noop,
  onItemDelete: noop,
  onEntryCreate: noop,
  onEntryUpdate: noop,
  onEntryDelete: noop,
  onCreateCategory: noop,
  onToggleExpand: noop,
};

/** A three-month `{ label, value }` series shared by chart/trend tests. */
export const trendSeries = [
  { label: "Apr", value: cents(168) },
  { label: "May", value: cents(175) },
  { label: "Jun", value: cents(208) },
];

/** Total of the selected-month income sources (a derived display value). */
export const totalIncome = incomeSources.reduce((sum, i) => sum + i.amount, 0);
