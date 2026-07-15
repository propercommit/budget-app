import { describe, it, expect } from "vitest";
import { getTrendMonths } from "@/lib/trend-months";
import { IncomeSource, SpendingItem } from "@/lib/types";

const item = (month: string): SpendingItem => ({
  id: `s-${month}`,
  seriesId: "ser-1",
  name: "Groceries",
  icon: "shopping-cart",
  recurring: true,
  budgeted: 50_000,
  spent: 0,
  month,
  categoryId: "cat-1",
});

const income = (month: string): IncomeSource => ({
  id: `i-${month}`,
  name: "Salary",
  amount: 500_000,
  icon: "briefcase",
  type: "active",
  startDate: new Date(`${month}-01`),
  month,
});

describe("getTrendMonths", () => {
  it("is empty with no data", () => {
    expect(getTrendMonths({}, [], "2026-07")).toEqual([]);
  });

  it("unions spending buckets with income-only months, sorted ascending", () => {
    const months = getTrendMonths(
      { "2026-06": [item("2026-06")], "2026-07": [item("2026-07")] },
      [income("2026-05"), income("2026-07")],
      "2026-07",
    );

    expect(months).toEqual(["2026-05", "2026-06", "2026-07"]);
  });

  it("excludes months after the selected month", () => {
    const months = getTrendMonths(
      { "2026-07": [item("2026-07")], "2026-09": [item("2026-09")] },
      [income("2026-08")],
      "2026-07",
    );

    expect(months).toEqual(["2026-07"]);
  });

  it("keeps empty materialized buckets on the axis (a month can legitimately sum to zero)", () => {
    expect(getTrendMonths({ "2026-06": [], "2026-07": [item("2026-07")] }, [], "2026-07")).toEqual(["2026-06", "2026-07"]);
  });
});
