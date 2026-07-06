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
import { SpendingCardExpanded } from "@/components/spending/spending-card-expanded";
import type { SpendingEntry } from "@/components/spending/spending-card-expanded";
import { EntryDetailPopin } from "@/components/spending/popins/spending-entry-detail-popin";

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

// Amounts in integer cents; formatAmount divides by 100 → "42 $" / "100 $".
const debit: SpendingEntry = { id: "e1", name: "Monthly rent", date: "2026-06-01", amount: 4200, direction: "debit", receipt: null, link: null };

const credit: SpendingEntry = { id: "e2", name: "Deposit refund", date: "2026-06-02", amount: 10_000, direction: "credit", receipt: null, link: null };

function renderExpandedWith(entries: SpendingEntry[]) {
  render(
    <SettingsProvider>
      <SpendingCardExpanded
        spendingName="Rent"
        categoryName="Housing"
        budgetNumber={180_000}
        totalSpent={-5_800}
        spendingEntries={entries.length}
        spendingItemIcon="home"
        spendingCategoryColor="#007AFF"
        entries={entries}
        onCollapse={() => {}}
        onEntryClick={() => {}}
        onAddEntry={() => {}}
        onItemDetailClick={() => {}}
        onItemEditClick={() => {}}
      />
    </SettingsProvider>,
  );
}

function renderDetail(entry: SpendingEntry) {
  render(
    <SettingsProvider>
      <EntryDetailPopin
        isOpen={true}
        onClose={() => {}}
        onEdit={() => {}}
        entry={entry}
        spendingName="Rent"
        spendingItemIcon="home"
        spendingCategoryColor="#007AFF"
      />
    </SettingsProvider>,
  );
}

describe("expanded card entry list — direction-aware amounts", () => {
  it("renders a debit as -amount in the default foreground color", () => {
    renderExpandedWith([debit]);

    const amount = screen.getByText("-42 $", { selector: "p" });

    expect(amount).toHaveStyle({ color: "var(--foreground)" });
  });

  it("renders a credit as +amount in green", () => {
    renderExpandedWith([credit]);

    const amount = screen.getByText("+100 $", { selector: "p" });

    expect(amount).toHaveStyle({ color: "#34C759" });
  });
});

describe("entry detail popin — direction-aware amount", () => {
  it("renders a debit as -amount in red", () => {
    renderDetail(debit);

    const amount = screen.getByText("-42 $", { selector: "p" });

    expect(amount).toHaveStyle({ color: "#FF3B30" });
  });

  it("renders a credit as +amount in green", () => {
    renderDetail(credit);

    const amount = screen.getByText("+100 $", { selector: "p" });

    expect(amount).toHaveStyle({ color: "#34C759" });
  });
});
