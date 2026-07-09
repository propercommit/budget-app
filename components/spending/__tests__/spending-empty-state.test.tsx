// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SpendingEmptyState } from "@/components/spending/spending-empty-state";
import { STARTER_CATEGORIES } from "@/lib/starter-categories";

describe("SpendingEmptyState", () => {
  it("renders the guided step-2 content with all six starter chips", () => {
    render(<SpendingEmptyState onStarterTap={vi.fn()} onAdd={vi.fn()} />);

    expect(screen.getByText("STEP 2 OF 2")).toBeInTheDocument();

    expect(screen.getByText("What are you spending on?")).toBeInTheDocument();

    for (const starter of STARTER_CATEGORIES) expect(screen.getByRole("button", { name: starter.name })).toBeInTheDocument();
  });

  it("fires onStarterTap with the tapped starter", () => {
    const onStarterTap = vi.fn();

    render(<SpendingEmptyState onStarterTap={onStarterTap} onAdd={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Transport" }));

    expect(onStarterTap).toHaveBeenCalledTimes(1);

    expect(onStarterTap).toHaveBeenCalledWith(STARTER_CATEGORIES.find(starter => starter.name === "Transport"));
  });

  it("fires onAdd from the CTA", () => {
    const onAdd = vi.fn();

    render(<SpendingEmptyState onStarterTap={vi.fn()} onAdd={onAdd} />);

    fireEvent.click(screen.getByRole("button", { name: "Add Spending Item" }));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
