import { describe, it, expect } from "vitest";
import { filterActiveCategories } from "@/lib/filter-active-categories";
import type { Category, SpendingItem } from "@/lib/types";

// --- fixtures -------------------------------------------------------------

const cat = (id: string, label: string): Category => ({
  id,
  label,
  icon: "tag",
  color: "#007AFF",
});

// Only the fields filterActiveCategories reads are meaningful; the rest are
// filled to satisfy the SpendingItem shape.
const item = (
  overrides: Pick<SpendingItem, "categoryId" | "startDate"> &
    Partial<SpendingItem>
): SpendingItem => ({
  id: `item-${Math.random()}`,
  seriesId: "series-1",
  name: "thing",
  icon: "tag",
  recurring: true,
  budgeted: 0,
  spent: 0,
  month: overrides.startDate.slice(0, 7),
  endDate: null,
  note: null,
  ...overrides,
});

const groceries = cat("cat-groceries", "Groceries");
const rent = cat("cat-rent", "Rent");
const travel = cat("cat-travel", "Travel");

describe("filterActiveCategories", () => {
  it("returns only categories that have an item active in the selected month", () => {
    const categories = [groceries, rent, travel];
    const spendingItems = [
      item({ categoryId: "cat-groceries", startDate: "2026-06-01" }),
      item({ categoryId: "cat-rent", startDate: "2026-06-01" }),
      // travel has no item -> excluded
    ];

    const result = filterActiveCategories({
      categories,
      spendingItems,
      selectedMonth: "2026-06",
    });

    expect(result.map((c) => c.id)).toEqual(["cat-groceries", "cat-rent"]);
  });

  it("preserves the input order of categories", () => {
    const categories = [travel, groceries, rent];
    const spendingItems = [
      item({ categoryId: "cat-rent", startDate: "2026-06-01" }),
      item({ categoryId: "cat-travel", startDate: "2026-06-01" }),
      item({ categoryId: "cat-groceries", startDate: "2026-06-01" }),
    ];

    const result = filterActiveCategories({
      categories,
      spendingItems,
      selectedMonth: "2026-06",
    });

    expect(result.map((c) => c.id)).toEqual([
      "cat-travel",
      "cat-groceries",
      "cat-rent",
    ]);
  });

  it("excludes a category whose only item starts after the selected month", () => {
    const result = filterActiveCategories({
      categories: [groceries],
      spendingItems: [item({ categoryId: "cat-groceries", startDate: "2026-07-01" })],
      selectedMonth: "2026-06",
    });
    expect(result).toEqual([]);
  });

  it("includes an item with a null endDate (open-ended) for any later month", () => {
    const result = filterActiveCategories({
      categories: [rent],
      spendingItems: [
        item({ categoryId: "cat-rent", startDate: "2026-01-01", endDate: null }),
      ],
      selectedMonth: "2026-12",
    });
    expect(result.map((c) => c.id)).toEqual(["cat-rent"]);
  });

  it("excludes an item whose endDate is before the selected month", () => {
    const result = filterActiveCategories({
      categories: [travel],
      spendingItems: [
        item({
          categoryId: "cat-travel",
          startDate: "2026-01-01",
          endDate: "2026-03-31",
        }),
      ],
      selectedMonth: "2026-06",
    });
    expect(result).toEqual([]);
  });

  it("is inclusive at the start-month boundary", () => {
    const result = filterActiveCategories({
      categories: [groceries],
      spendingItems: [
        item({ categoryId: "cat-groceries", startDate: "2026-06-15" }),
      ],
      selectedMonth: "2026-06",
    });
    // startDate "2026-06".slice(0,7) === selectedMonth -> active
    expect(result.map((c) => c.id)).toEqual(["cat-groceries"]);
  });

  it("is inclusive at the end-month boundary", () => {
    const result = filterActiveCategories({
      categories: [travel],
      spendingItems: [
        item({
          categoryId: "cat-travel",
          startDate: "2026-01-01",
          endDate: "2026-06-30",
        }),
      ],
      selectedMonth: "2026-06",
    });
    // endDate "2026-06" >= selectedMonth -> still active in June
    expect(result.map((c) => c.id)).toEqual(["cat-travel"]);
  });

  describe("YYYY-MM lexicographic ordering (zero-padding must hold)", () => {
    // The comparison is plain string <= / >= on "YYYY-MM" slices. This only
    // gives correct chronological results because months are zero-padded.
    it("treats 2026-02 as earlier than 2026-10 (string compare, not numeric)", () => {
      // Item active Feb..Oct. Selecting October must include it. If padding
      // were dropped ("2026-2"), "2026-2" > "2026-10" lexically and this breaks.
      const result = filterActiveCategories({
        categories: [groceries],
        spendingItems: [
          item({
            categoryId: "cat-groceries",
            startDate: "2026-02-01",
            endDate: "2026-10-31",
          }),
        ],
        selectedMonth: "2026-10",
      });
      expect(result.map((c) => c.id)).toEqual(["cat-groceries"]);
    });

    it("a January item is active in the following December of the same year", () => {
      const result = filterActiveCategories({
        categories: [rent],
        spendingItems: [
          item({ categoryId: "cat-rent", startDate: "2026-01-01", endDate: null }),
        ],
        selectedMonth: "2026-12",
      });
      expect(result.map((c) => c.id)).toEqual(["cat-rent"]);
    });

    it("orders across a year boundary correctly (2025-12 < 2026-01)", () => {
      const result = filterActiveCategories({
        categories: [rent],
        spendingItems: [
          item({ categoryId: "cat-rent", startDate: "2025-12-01", endDate: null }),
        ],
        selectedMonth: "2026-01",
      });
      expect(result.map((c) => c.id)).toEqual(["cat-rent"]);
    });
  });

  it("returns an empty array when there are no spending items", () => {
    expect(
      filterActiveCategories({
        categories: [groceries, rent],
        spendingItems: [],
        selectedMonth: "2026-06",
      })
    ).toEqual([]);
  });

  it("dedupes correctly when multiple items map to the same category", () => {
    const result = filterActiveCategories({
      categories: [groceries],
      spendingItems: [
        item({ categoryId: "cat-groceries", startDate: "2026-06-01" }),
        item({ categoryId: "cat-groceries", startDate: "2026-06-10" }),
      ],
      selectedMonth: "2026-06",
    });
    // .filter returns the category once regardless of how many items match.
    expect(result).toHaveLength(1);
  });
});
