// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/api", () => ({
  getSettings: vi.fn().mockRejectedValue(new Error("offline")),
  updateSettings: vi.fn(),
}));

import { SettingsProvider } from "@/lib/settings-context";
import { IncomeCard } from "@/components/income/income-card";
import { IncomeSource } from "@/lib/types";

// Amounts are integer cents; formatAmount renders major units + NBSP + symbol,
// but testing-library's default normalizer collapses the NBSP to a plain space.
const TOTAL = "6,000 $";
const ACTIVE = "5,000 $";
const PASSIVE = "1,000 $";

const INCOMES: IncomeSource[] = [
  { id: "i1", name: "Salary", amount: 300_000, icon: "briefcase", type: "active", startDate: new Date("2026-07-01"), month: "2026-07" },
  { id: "i2", name: "Freelance", amount: 200_000, icon: "laptop", type: "active", startDate: new Date("2026-07-01"), month: "2026-07" },
  { id: "i3", name: "Dividends", amount: 100_000, icon: "piggy-bank", type: "passive", startDate: new Date("2026-07-01"), month: "2026-07" },
];

function renderCard() {
  return render(
    <SettingsProvider>
      <IncomeCard incomes={INCOMES} onAdd={vi.fn()} onSelect={vi.fn()} />
    </SettingsProvider>
  );
}

/** First match is the desktop breakdown row; clicks bubble to the row's handler. */
function typeRow(label: "Active" | "Passive") {
  return screen.getAllByText(label)[0];
}

describe("IncomeCard — type focus (collapsed)", () => {
  it("shows the grand total by default", () => {
    renderCard();

    // Desktop headline + mobile donut center both carry the total.
    expect(screen.getAllByText(TOTAL)).toHaveLength(2);

    expect(screen.getByText("Total Monthly Income")).toBeInTheDocument();

    expect(screen.getByText("Total Income")).toBeInTheDocument();
  });

  it("clicking a type pins its amount; clicking again unpins back to the total", () => {
    renderCard();

    fireEvent.click(typeRow("Active"));

    expect(screen.queryByText(TOTAL)).toBeNull();

    // Desktop headline label + mobile donut center label.
    expect(screen.getAllByText("Active Income")).toHaveLength(2);

    // Headline + center now show the active total, on top of the 2 breakdown rows.
    expect(screen.getAllByText(ACTIVE)).toHaveLength(4);

    fireEvent.click(typeRow("Active"));

    expect(screen.getAllByText(TOTAL)).toHaveLength(2);

    expect(screen.getAllByText(ACTIVE)).toHaveLength(2);
  });

  it("clicking the other type switches the pin directly", () => {
    renderCard();

    fireEvent.click(typeRow("Active"));

    fireEvent.click(typeRow("Passive"));

    expect(screen.getAllByText("Passive Income")).toHaveLength(2);

    expect(screen.getAllByText(PASSIVE)).toHaveLength(4);

    expect(screen.queryByText("Active Income")).toBeNull();
  });

  it("hovering a type previews its amount and reverts on leave", () => {
    renderCard();

    fireEvent.mouseEnter(typeRow("Passive"));

    expect(screen.getAllByText("Passive Income")).toHaveLength(2);

    expect(screen.queryByText(TOTAL)).toBeNull();

    fireEvent.mouseLeave(typeRow("Passive"));

    expect(screen.getAllByText(TOTAL)).toHaveLength(2);
  });

  it("hover wins over the pin while pointing, then falls back to the pin", () => {
    renderCard();

    fireEvent.click(typeRow("Active"));

    fireEvent.mouseEnter(typeRow("Passive"));

    expect(screen.getAllByText("Passive Income")).toHaveLength(2);

    fireEvent.mouseLeave(typeRow("Passive"));

    expect(screen.getAllByText("Active Income")).toHaveLength(2);

    expect(screen.getAllByText(ACTIVE)).toHaveLength(4);
  });
});

describe("IncomeCard — type focus (expanded)", () => {
  it("clicking a legend chip pins its amount in the expanded headline", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Expand" }));

    expect(screen.getByText(TOTAL)).toBeInTheDocument();

    expect(screen.getByText("Total Monthly")).toBeInTheDocument();

    fireEvent.click(screen.getByText("83% Active"));

    expect(screen.getByText("Active Income")).toBeInTheDocument();

    expect(screen.getByText(ACTIVE)).toBeInTheDocument();

    expect(screen.queryByText(TOTAL)).toBeNull();
  });

  it("collapsing the card resets the pinned type", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Expand" }));

    fireEvent.click(screen.getByText("17% Passive"));

    expect(screen.getByText("Passive Income")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Collapse" }));

    expect(screen.getAllByText(TOTAL)).toHaveLength(2);

    expect(screen.queryByText("Passive Income")).toBeNull();
  });
});
