// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// SettingsProvider calls getSettings() on mount; stub the API so it stays
// offline and falls back to the USD default ($).
vi.mock("@/lib/api", () => ({
  getSettings: vi.fn().mockRejectedValue(new Error("offline")),
  updateSettings: vi.fn(),
}));

import { SettingsProvider } from "@/lib/settings-context";
import { BudgetOverviewCollapsed } from "@/components/budget-overview/budget-overview-collapsed";

function renderCollapsed(props: { totalIncome: number; totalSpent: number }) {
  return render(
    <SettingsProvider>
      <BudgetOverviewCollapsed {...props} onExpand={() => {}} />
    </SettingsProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BudgetOverviewCollapsed — remaining vs overspent", () => {
  it("shows 'Remaining' and a positive remainder when under budget", () => {
    renderCollapsed({ totalIncome: 5000, totalSpent: 2000 });
    expect(screen.getByText("Remaining")).toBeInTheDocument();
    expect(screen.queryByText("Over by")).not.toBeInTheDocument();
    // remaining = 5000 - 2000 = 3000 -> "3,000 $"
    expect(screen.getByText("3,000 $")).toBeInTheDocument();
  });

  it("switches to 'Over by' with a negative sign when spent exceeds income", () => {
    renderCollapsed({ totalIncome: 1000, totalSpent: 1500 });
    expect(screen.getByText("Over by")).toBeInTheDocument();
    // |remaining| = 500, prefixed with '-'
    expect(screen.getByText("-500 $")).toBeInTheDocument();
  });
});

describe("BudgetOverviewCollapsed — income-used percentage", () => {
  it("renders a rounded percent of income spent", () => {
    renderCollapsed({ totalIncome: 4000, totalSpent: 1000 });
    // 1000 / 4000 = 25%
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("guards against divide-by-zero when income is 0", () => {
    // incomeUsedPercent falls back to 0 when totalIncome is 0.
    renderCollapsed({ totalIncome: 0, totalSpent: 500 });
    expect(screen.getByText("0%")).toBeInTheDocument();
    // With zero income any spend is overspending.
    expect(screen.getByText("Over by")).toBeInTheDocument();
  });
});
