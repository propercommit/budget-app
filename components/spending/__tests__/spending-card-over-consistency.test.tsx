// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, within } from "@testing-library/react";

// SettingsProvider calls getSettings() on mount; keep it offline so it falls
// back to the USD default ("<value> $").
vi.mock("@/lib/api", () => ({
  getSettings: vi.fn().mockRejectedValue(new Error("offline")),
  updateSettings: vi.fn(),
}));

import { SettingsProvider } from "@/lib/settings-context";
import { SpendingCardCollapsed } from "@/components/spending/spending-card-collapsed";
import { SpendingCardExpanded } from "@/components/spending/spending-card-expanded";

// Radix Select (the expanded card's sort control) pokes APIs jsdom lacks.
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.setPointerCapture = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
});

// Shared money props, in integer cents: budget CHF 400.00, spent CHF 677.79,
// so the item is CHF 277.79 over budget (40000 - 67779 = -27779 cents).
const OVER = { budgetNumber: 40_000, totalSpent: 67_779 };
// Under-budget variant: CHF 272.21 left (40000 - 12779).
const UNDER = { budgetNumber: 40_000, totalSpent: 12_779 };

function renderCollapsed(money: { budgetNumber: number; totalSpent: number }) {
  return render(
    <SettingsProvider>
      <SpendingCardCollapsed
        spendingName="Groceries"
        categoryName="Food"
        budgetNumber={money.budgetNumber}
        totalSpent={money.totalSpent}
        spendingEntries={3}
        spendingItemIcon="shopping-cart"
        spendingCategoryColor="#34C759"
        onExpand={() => {}}
      />
    </SettingsProvider>
  ).container;
}

function renderExpanded(money: { budgetNumber: number; totalSpent: number }) {
  return render(
    <SettingsProvider>
      <SpendingCardExpanded
        spendingName="Groceries"
        categoryName="Food"
        budgetNumber={money.budgetNumber}
        totalSpent={money.totalSpent}
        spendingEntries={0}
        spendingItemIcon="shopping-cart"
        spendingCategoryColor="#34C759"
        entries={[]}
        onCollapse={() => {}}
        onEntryClick={() => {}}
        onAddEntry={() => {}}
        onItemDetailClick={() => {}}
      />
    </SettingsProvider>
  ).container;
}

describe("SpendingCard — over/left is consistent between collapsed and expanded", () => {
  it("shows the same 'over' amount, formatted through formatAmount (÷100)", async () => {
    const collapsed = renderCollapsed(OVER);

    // Correct major-unit value with the currency symbol, NOT raw cents.
    expect(await within(collapsed).findByText("277.79 $ over")).toBeInTheDocument();

    const expanded = renderExpanded(OVER);

    expect(await within(expanded).findByText("277.79 $ over")).toBeInTheDocument();

    // Regression guard: the expanded card must never print the raw cents value
    // (this was the bug — "$27,779 over" instead of "277.79 $ over").
    expect(expanded.textContent).not.toContain("27,779");
  });

  it("shows the same 'left' amount when under budget", async () => {
    const collapsed = renderCollapsed(UNDER);

    expect(await within(collapsed).findByText("272.21 $ left")).toBeInTheDocument();

    const expanded = renderExpanded(UNDER);

    expect(await within(expanded).findByText("272.21 $ left")).toBeInTheDocument();

    expect(expanded.textContent).not.toContain("27,221");
  });
});

describe("SpendingCard — net-credit month (negative spent)", () => {
  // A card holding only credits (e.g. a refund month) has negative spent —
  // valid data. The bar must clamp to 0%: an unclamped negative width is
  // invalid CSS, which browsers drop, leaving the div at width:auto (a FULL
  // bar). The displayed numbers stay truthful and unclamped.
  const CREDIT = { budgetNumber: 40_000, totalSpent: -15_000 };

  it("renders a 0-width progress bar, not a full one (collapsed)", () => {
    const collapsed = renderCollapsed(CREDIT);

    const bar = collapsed.querySelector<HTMLElement>(".h-3 > div");

    expect(bar).not.toBeNull();

    expect(bar?.style.width).toBe("0%");
  });

  it("renders a 0-width bar and truthful negative/raised amounts (expanded)", async () => {
    const expanded = renderExpanded(CREDIT);

    const bar = expanded.querySelector<HTMLElement>(".h-3 > div");

    expect(bar?.style.width).toBe("0%");

    // Header renders net-credit spent as "+X" (see lib/spending/format-spent);
    // remaining = budget - spent stays a plain formula on the signed value, so
    // the credit genuinely increases what's left.
    expect(expanded.textContent).toContain("+150 $");

    expect(expanded.textContent).not.toContain("-150 $");

    expect(await within(expanded).findByText("550 $ left")).toBeInTheDocument();
  });
});
