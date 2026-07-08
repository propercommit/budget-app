import type { BudgetSeries, Category, SpendingEntry, SpendingItem } from "@prisma/client";

/**
 * The Prisma include every spending endpoint loads so an incarnation can be
 * flattened into the client shape — the series (identity fields) with its
 * category, plus the entries.
 */
export const spendingItemInclude = {
  series: { include: { category: true } },
  spendingEntries: true,
} as const;

/** An incarnation loaded with {@link spendingItemInclude}. */
export type SpendingItemWithSeries = SpendingItem & {
  series: BudgetSeries & { category: Category };
  spendingEntries: SpendingEntry[];
};

/**
 * Flattens a series-backed incarnation into the flat item shape the client has
 * always consumed: `name`/`icon`/`categoryId`/`category` are lifted off the
 * series onto the item, `spendingEntries` is renamed `entries`, and
 * `seriesId`/`recurring` are exposed for series-aware flows (typeahead, resume).
 */
export function flattenSpendingItem(item: SpendingItemWithSeries) {

  const { series, spendingEntries, ...incarnation } = item;

  return {
    ...incarnation,
    name: series.name,
    icon: series.icon,
    recurring: series.recurring,
    categoryId: series.categoryId,
    category: series.category,
    entries: spendingEntries,
  };
}
