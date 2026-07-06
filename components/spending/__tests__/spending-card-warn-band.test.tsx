// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";

// SettingsProvider calls getSettings() on mount; keep it offline so it falls
// back to the USD default ("<value> $").
vi.mock("@/lib/api", () => ({
  getSettings: vi.fn().mockRejectedValue(new Error("offline")),
  updateSettings: vi.fn(),
}));

import { SettingsProvider } from "@/lib/settings-context";
import { SpendingCardCollapsed } from "@/components/spending/spending-card-collapsed";
import { SpendingCardExpanded } from "@/components/spending/spending-card-expanded";
import { installRadixJsdomStubs } from "./radix-jsdom-stubs";

// Radix Select (the expanded card's sort control) pokes APIs jsdom lacks.
beforeAll(installRadixJsdomStubs);

// Warn-band boundary, in integer cents: 340.00 of 400.00 is exactly 85%,
// the threshold where bar and pill turn orange while still under budget.
const AT_WARN = { budgetNumber: 40_000, totalSpent: 34_000 };
// Just under the band: 339.00 of 400.00 (84.75%) stays green.
const BELOW_WARN = { budgetNumber: 40_000, totalSpent: 33_900 };

interface CardHandlers {
  onEditClick?: () => void;
  onExpand?: () => void;
  onCollapse?: () => void;
}

function renderCollapsed(money: { budgetNumber: number; totalSpent: number }, handlers: CardHandlers = {}) {
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
        onExpand={handlers.onExpand ?? (() => {})}
        onEditClick={handlers.onEditClick ?? (() => {})}
      />
    </SettingsProvider>
  ).container;
}

function renderExpanded(money: { budgetNumber: number; totalSpent: number }, handlers: CardHandlers = {}) {
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
        onCollapse={handlers.onCollapse ?? (() => {})}
        onEntryClick={() => {}}
        onAddEntry={() => {}}
        onItemDetailClick={() => {}}
        onEditClick={handlers.onEditClick ?? (() => {})}
      />
    </SettingsProvider>
  ).container;
}

describe("SpendingCard — orange warn band from 85% of budget", () => {
  it("turns bar and pill orange at exactly 85% (collapsed)", () => {
    const collapsed = renderCollapsed(AT_WARN);

    const bar = collapsed.querySelector<HTMLElement>(".h-3 > div");

    expect(bar).not.toBeNull();

    expect(bar).toHaveStyle({ backgroundColor: "#FF9500" });

    expect(screen.getByText("60 $ left")).toHaveStyle({ color: "#FF9500" });
  });

  it("stays green just below the band (collapsed)", () => {
    const collapsed = renderCollapsed(BELOW_WARN);

    const bar = collapsed.querySelector<HTMLElement>(".h-3 > div");

    expect(bar).toHaveStyle({ backgroundColor: "#34C759" });

    expect(screen.getByText("61 $ left")).toHaveStyle({ color: "#34C759" });
  });

  it("matches the collapsed treatment at 85% (expanded)", () => {
    const expanded = renderExpanded(AT_WARN);

    const bar = expanded.querySelector<HTMLElement>(".h-3 > div");

    expect(bar).toHaveStyle({ backgroundColor: "#FF9500" });

    expect(screen.getByText("60 $ left")).toHaveStyle({ color: "#FF9500" });
  });
});

describe("SpendingCard — header edit button", () => {
  it("fires onEditClick from the collapsed card", () => {
    const onEditClick = vi.fn();

    renderCollapsed(BELOW_WARN, { onEditClick });

    fireEvent.click(screen.getByLabelText("Edit spending item"));

    expect(onEditClick).toHaveBeenCalledTimes(1);
  });

  it("fires onEditClick from the expanded card", () => {
    const onEditClick = vi.fn();

    renderExpanded(BELOW_WARN, { onEditClick });

    fireEvent.click(screen.getByLabelText("Edit spending item"));

    expect(onEditClick).toHaveBeenCalledTimes(1);
  });
});

describe("SpendingCard — bottom expand toggle bar", () => {
  it("fires onExpand from the collapsed card", () => {
    const onExpand = vi.fn();

    renderCollapsed(BELOW_WARN, { onExpand });

    fireEvent.click(screen.getByLabelText("Show entries"));

    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  it("fires onCollapse from the expanded card", () => {
    const onCollapse = vi.fn();

    renderExpanded(BELOW_WARN, { onCollapse });

    fireEvent.click(screen.getByLabelText("Hide entries"));

    expect(onCollapse).toHaveBeenCalledTimes(1);
  });
});
