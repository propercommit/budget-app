// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";

// SettingsProvider calls getSettings() on mount; keep it offline so it falls
// back to the USD default ("<value> $").
vi.mock("@/lib/api", () => ({
  getSettings: vi.fn().mockRejectedValue(new Error("offline")),
  updateSettings: vi.fn(),
}));

import { SettingsProvider } from "@/lib/settings-context";
import { SpendingCardCollapsed } from "@/components/spending/spending-card-collapsed";
import { SpendingCardExpanded } from "@/components/spending/spending-card-expanded";
import { SpendingItemDetailPopin } from "@/components/spending/popins/spending-item-detail-popin";
import { installRadixJsdomStubs } from "./radix-jsdom-stubs";

// Radix Select (the expanded card's sort control) pokes APIs jsdom lacks.
beforeAll(installRadixJsdomStubs);

// Net-credit month: credits exceeded debits by 89.12 (−8912 cents) on a
// 300.00 budget, so 389.12 is left. The header must read "+89.12 $" in green —
// never a bare "-89.12 $".
const NET_CREDIT = { budgetNumber: 30_000, totalSpent: -8_912 };
// Ordinary month: 89.12 spent of 300.00.
const NET_DEBIT = { budgetNumber: 30_000, totalSpent: 8_912 };

function renderCollapsed(money: { budgetNumber: number; totalSpent: number }) {
  render(
    <SettingsProvider>
      <SpendingCardCollapsed
        spendingName="Clothing & Personal"
        categoryName="Shopping"
        budgetNumber={money.budgetNumber}
        totalSpent={money.totalSpent}
        spendingEntries={2}
        spendingItemIcon="shirt"
        spendingCategoryColor="#AF52DE"
        onExpand={() => {}}
        onEditClick={() => {}}
      />
    </SettingsProvider>,
  );
}

function renderExpanded(money: { budgetNumber: number; totalSpent: number }) {
  render(
    <SettingsProvider>
      <SpendingCardExpanded
        spendingName="Clothing & Personal"
        categoryName="Shopping"
        budgetNumber={money.budgetNumber}
        totalSpent={money.totalSpent}
        spendingEntries={0}
        spendingItemIcon="shirt"
        spendingCategoryColor="#AF52DE"
        entries={[]}
        onCollapse={() => {}}
        onEntryClick={() => {}}
        onAddEntry={() => {}}
        onItemDetailClick={() => {}}
        onEditClick={() => {}}
      />
    </SettingsProvider>,
  );
}

function renderDetailPopin(money: { budgetNumber: number; totalSpent: number }) {
  render(
    <SettingsProvider>
      <SpendingItemDetailPopin
        isOpen={true}
        onClose={() => {}}
        onEdit={() => {}}
        spendingName="Clothing & Personal"
        spendingItemIcon="shirt"
        categoryName="Shopping"
        spendingCategoryColor="#AF52DE"
        budgetNumber={money.budgetNumber}
        totalSpent={money.totalSpent}
        entriesCount={2}
      />
    </SettingsProvider>,
  );
}

describe("collapsed card header — net-credit spent", () => {
  it("renders +amount in green and keeps the left badge consistent", () => {
    renderCollapsed(NET_CREDIT);

    const amount = screen.getByText("+89.12 $", { selector: "p" });

    expect(amount).toHaveStyle({ color: "#34C759" });

    expect(screen.getByText("389.12 $ left")).toBeInTheDocument();
  });

  it("keeps a positive spent unchanged: plain amount in the dark color", () => {
    renderCollapsed(NET_DEBIT);

    const amount = screen.getByText("89.12 $", { selector: "p" });

    expect(amount).toHaveStyle({ color: "var(--foreground)" });

    expect(screen.getByText("210.88 $ left")).toBeInTheDocument();
  });
});

describe("expanded card header — net-credit spent", () => {
  it("renders +amount in green", () => {
    renderExpanded(NET_CREDIT);

    const amount = screen.getByText("+89.12 $", { selector: "p" });

    expect(amount).toHaveStyle({ color: "#34C759" });
  });

  it("keeps a positive spent unchanged", () => {
    renderExpanded(NET_DEBIT);

    const amount = screen.getByText("89.12 $", { selector: "p" });

    expect(amount).toHaveStyle({ color: "var(--foreground)" });
  });
});

describe("item detail popin — net-credit spent", () => {
  it("renders +amount in green in the Spent row", () => {
    renderDetailPopin(NET_CREDIT);

    const amount = screen.getByText("+89.12 $", { selector: "span" });

    expect(amount).toHaveStyle({ color: "#34C759" });
  });

  it("keeps a positive spent unchanged", () => {
    renderDetailPopin(NET_DEBIT);

    const amount = screen.getByText("89.12 $", { selector: "span" });

    expect(amount).toHaveStyle({ color: "var(--foreground)" });
  });
});
