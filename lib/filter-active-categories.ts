import { Category, SpendingItem } from "./types";

interface FilterActiveCategoriesParams {
    categories: Category[],
    spendingItems: SpendingItem[],
};

/**
 * Categories that are in use by at least one of the given spending items —
 * callers pass a single month's items, so "active" means "has a budget line
 * this month". (Item-level date windows are gone since the series refactor;
 * a series' lifecycle is its `recurring` flag plus incarnation presence.)
 */
export function filterActiveCategories({ categories, spendingItems }: FilterActiveCategoriesParams): Category[] {

    return categories.filter((category) =>
        spendingItems.some((spendingItem) => spendingItem.categoryId === category.id)
    );
}
