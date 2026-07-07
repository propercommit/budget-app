import { describe, it, expect } from "vitest";
import { filterActiveCategories } from "@/lib/filter-active-categories";
import type { Category, SpendingItem } from "@/lib/types";

const cat = (id: string, label: string): Category => ({
  id,
  label,
  icon: "tag",
  color: "#007AFF",
});

// Only categoryId matters to the filter; the rest satisfies the shape.
const item = (categoryId: string): SpendingItem => ({
  id: `item-${categoryId}-${Math.random()}`,
  seriesId: "series-1",
  name: "thing",
  icon: "tag",
  recurring: true,
  budgeted: 0,
  spent: 0,
  month: "2026-06",
  note: null,
  categoryId,
});

const groceries = cat("cat-groceries", "Groceries");
const rent = cat("cat-rent", "Rent");
const travel = cat("cat-travel", "Travel");

describe("filterActiveCategories", () => {
  it("keeps only categories used by at least one of the given items", () => {
    const result = filterActiveCategories({
      categories: [groceries, rent, travel],
      spendingItems: [item("cat-groceries"), item("cat-rent")],
    });

    expect(result).toEqual([groceries, rent]);
  });

  it("returns no categories when there are no items", () => {
    const result = filterActiveCategories({
      categories: [groceries, rent],
      spendingItems: [],
    });

    expect(result).toEqual([]);
  });

  it("ignores items pointing at unknown categories", () => {
    const result = filterActiveCategories({
      categories: [groceries],
      spendingItems: [item("cat-unknown")],
    });

    expect(result).toEqual([]);
  });

  it("counts a category once regardless of how many items use it", () => {
    const result = filterActiveCategories({
      categories: [groceries],
      spendingItems: [item("cat-groceries"), item("cat-groceries"), item("cat-groceries")],
    });

    expect(result).toHaveLength(1);
  });

  it("preserves the incoming category order", () => {
    const result = filterActiveCategories({
      categories: [travel, groceries, rent],
      spendingItems: [item("cat-rent"), item("cat-travel")],
    });

    expect(result.map((c) => c.id)).toEqual(["cat-travel", "cat-rent"]);
  });
});
