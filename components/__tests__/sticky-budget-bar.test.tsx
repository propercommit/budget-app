// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/api", () => ({
  getSettings: vi.fn().mockRejectedValue(new Error("offline")),
  updateSettings: vi.fn(),
}));

import { SettingsProvider } from "@/lib/settings-context";
import { StickyBudgetBar } from "@/components/sticky-budget-bar";

/**
 * The bar shows itself only when the spending section is in view AND the budget
 * overview is NOT yet visible. We control that by stubbing the two sentinel
 * elements' getBoundingClientRect. innerHeight is forced to 800.
 */
function setSentinels(opts: {
  spendingInView: boolean;
  budgetVisible: boolean;
}) {
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });

  const spending = document.createElement("div");
  spending.setAttribute("data-spending-section", "");
  spending.getBoundingClientRect = () =>
    (opts.spendingInView
      ? { top: 100, bottom: 400 }
      : { top: 900, bottom: 1200 }) as DOMRect;

  const budget = document.createElement("div");
  budget.setAttribute("data-budget-overview", "");
  budget.getBoundingClientRect = () =>
    (opts.budgetVisible ? { top: 500 } : { top: 1000 }) as DOMRect;

  document.body.append(spending, budget);
}

function renderBar(props: {
  totalIncome: number;
  totalBudgeted: number;
  totalSpent: number;
}) {
  return render(
    <SettingsProvider>
      <StickyBudgetBar {...props} />
    </SettingsProvider>
  );
}

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("StickyBudgetBar — visibility", () => {
  it("renders nothing when the sentinel elements are absent", () => {
    const { container } = renderBar({ totalIncome: 1000, totalBudgeted: 500, totalSpent: 200 });
    expect(container.firstChild).toBeNull();
  });

  it("stays hidden while the budget overview is already on screen", () => {
    setSentinels({ spendingInView: true, budgetVisible: true });
    renderBar({ totalIncome: 1000, totalBudgeted: 500, totalSpent: 200 });
    expect(screen.queryByText("Remaining Budget")).not.toBeInTheDocument();
  });

  it("shows when spending is in view and the overview has not scrolled in", () => {
    setSentinels({ spendingInView: true, budgetVisible: false });
    renderBar({ totalIncome: 1000, totalBudgeted: 500, totalSpent: 200 });
    expect(screen.getByText("Remaining Budget")).toBeInTheDocument();
    expect(screen.getByText("After Spending")).toBeInTheDocument();
  });
});

describe("StickyBudgetBar — figures and sign branching", () => {
  beforeEach(() => {
    setSentinels({ spendingInView: true, budgetVisible: false });
  });

  it("computes remaining budget (income - budgeted) and after-spending (income - spent)", () => {
    renderBar({ totalIncome: 300_000, totalBudgeted: 200_000, totalSpent: 120_000 });
    // remaining = 100_000c ($1,000), after = 180_000c ($1,800).
    expect(screen.getByText("1,000 $")).toBeInTheDocument();
    expect(screen.getByText("1,800 $")).toBeInTheDocument();
  });

  it("renders negative figures when budgeted/spent exceed income", () => {
    renderBar({ totalIncome: 100_000, totalBudgeted: 150_000, totalSpent: 130_000 });
    // remaining = -50_000c (-$500), after = -30_000c (-$300).
    expect(screen.getByText("-500 $")).toBeInTheDocument();
    expect(screen.getByText("-300 $")).toBeInTheDocument();
  });

  it("treats an exactly-zero remainder as non-negative (green path)", () => {
    renderBar({ totalIncome: 1000, totalBudgeted: 1000, totalSpent: 1000 });
    // Both figures are 0; rendered as "0 $". Two zero cells appear.
    expect(screen.getAllByText("0 $").length).toBe(2);
  });
});
