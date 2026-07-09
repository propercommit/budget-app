import { describe, it, expect } from "vitest";
import { hasAccountData } from "@/lib/first-run";
import { IncomeSource, SpendingItem } from "@/lib/types";

const item: SpendingItem = {
  id: "s1",
  seriesId: "ser-1",
  name: "Groceries",
  icon: "shopping-cart",
  recurring: true,
  budgeted: 50_000,
  spent: 0,
  month: "2026-07",
  categoryId: "cat-1",
};

const income: IncomeSource = {
  id: "i1",
  name: "Salary",
  amount: 500_000,
  icon: "briefcase",
  type: "active",
  startDate: new Date("2026-07-01"),
  month: "2026-07",
};

describe("hasAccountData", () => {
  it("is false for a brand-new account", () => {
    expect(hasAccountData({}, [], [])).toBe(false);
  });

  it("ignores empty month buckets (materialized months store [])", () => {
    expect(hasAccountData({ "2026-06": [], "2026-07": [] }, [], [])).toBe(false);
  });

  it("is true once any loaded month has a spending item", () => {
    expect(hasAccountData({ "2026-06": [], "2026-07": [item] }, [], [])).toBe(true);
  });

  it("is true with income in the selected month only", () => {
    expect(hasAccountData({}, [income], [])).toBe(true);
  });

  it("is true with income in other loaded months only", () => {
    expect(hasAccountData({}, [], [income])).toBe(true);
  });
});
