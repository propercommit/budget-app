import { describe, it, expect } from "vitest";
import { countCategoryEntries } from "@/lib/category-entry-counts";
import type { SpendingItem, SpendingEntry } from "@/lib/types";

function entry(id: string): SpendingEntry {
  return { id, name: id, amount: 100, direction: "debit", date: "2026-06-01", receiptUrl: null, link: null, spendingItemId: "s1" };
}

function item(overrides: Partial<SpendingItem> & Pick<SpendingItem, "id" | "month" | "categoryId">): SpendingItem {
  return {
    seriesId: `series-${overrides.id}`,
    name: overrides.id,
    icon: "shopping-cart",
    recurring: true,
    budgeted: 0,
    spent: 0,
    startDate: `${overrides.month}-01`,
    ...overrides,
  };
}

describe("countCategoryEntries", () => {
  it("sums entries per category across all loaded months", () => {
    const spendingData = {
      "2026-05": [item({ id: "a", month: "2026-05", categoryId: "cat-1", entries: [entry("e1"), entry("e2")] })],
      "2026-06": [
        item({ id: "b", month: "2026-06", categoryId: "cat-1", entries: [entry("e3")] }),
        item({ id: "c", month: "2026-06", categoryId: "cat-2", entries: [entry("e4")] }),
      ],
    };

    expect(countCategoryEntries(spendingData, {})).toEqual({ "cat-1": 3, "cat-2": 1 });
  });

  it("treats a missing entries array as zero", () => {
    const spendingData = {
      "2026-06": [item({ id: "a", month: "2026-06", categoryId: "cat-1" })],
    };

    expect(countCategoryEntries(spendingData, {})).toEqual({ "cat-1": 0 });
  });

  it("adds the server-provided pre-window totals on top of the live sum", () => {
    const spendingData = {
      "2026-06": [item({ id: "a", month: "2026-06", categoryId: "cat-1", entries: [entry("e1")] })],
    };

    expect(countCategoryEntries(spendingData, { "cat-1": 7, "cat-2": 4 })).toEqual({
      "cat-1": 8,
      "cat-2": 4,
    });
  });

  it("counts month buckets created mid-session before the loaded window (disjoint from server totals)", () => {
    // Client state only ever gains pre-window months through freshly-created
    // rows (never re-fetched history), so these entries are additional to the
    // server snapshot, not duplicates of it.
    const spendingData = {
      "2024-01": [item({ id: "old", month: "2024-01", categoryId: "cat-1", entries: [entry("e1"), entry("e2")] })],
      "2026-06": [item({ id: "new", month: "2026-06", categoryId: "cat-1", entries: [entry("e3")] })],
    };

    expect(countCategoryEntries(spendingData, { "cat-1": 2 })).toEqual({ "cat-1": 5 });
  });

  it("returns an empty record for no data", () => {
    expect(countCategoryEntries({}, {})).toEqual({});
  });

  it("does not mutate the pre-window counts input", () => {
    const preWindow = { "cat-1": 1 };
    const spendingData = {
      "2026-06": [item({ id: "a", month: "2026-06", categoryId: "cat-1", entries: [entry("e1")] })],
    };

    countCategoryEntries(spendingData, preWindow);

    expect(preWindow).toEqual({ "cat-1": 1 });
  });
});
