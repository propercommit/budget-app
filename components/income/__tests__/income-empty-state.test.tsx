// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IncomeEmptyState } from "@/components/income/income-empty-state";

describe("IncomeEmptyState", () => {
  it("renders the guided step-1 content", () => {
    render(<IncomeEmptyState onAdd={vi.fn()} />);

    expect(screen.getByText("STEP 1 OF 2")).toBeInTheDocument();

    expect(screen.getByText("Where does your money come from?")).toBeInTheDocument();
  });

  it("fires onAdd from the CTA", () => {
    const onAdd = vi.fn();

    render(<IncomeEmptyState onAdd={onAdd} />);

    fireEvent.click(screen.getByRole("button", { name: "Add Income" }));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
