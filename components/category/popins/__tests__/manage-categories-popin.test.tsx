// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ComponentProps } from "react";
import { ManageCategoriesPopin } from "@/components/category/popins/manage-categories-popin";
import type { Category } from "@/lib/types";

const categories: Category[] = [
  { id: "cat-groceries", label: "Groceries", icon: "shopping-cart", color: "#34C759" },
  { id: "cat-transport", label: "Transport", icon: "car", color: "#007AFF" },
  { id: "cat-dining", label: "Dining", icon: "coffee", color: "#FF9F0A" },
];

const entryCounts: Record<string, number> = { "cat-groceries": 5, "cat-transport": 1 };

type PopinProps = ComponentProps<typeof ManageCategoriesPopin>;

function renderPopin(overrides: Partial<PopinProps> = {}) {

  const handlers = {
    onClose: vi.fn(),
    onEditCategory: vi.fn(),
    onDeleteCategory: vi.fn(),
    onNewCategory: vi.fn(),
  };

  render(
    <ManageCategoriesPopin
      isOpen={true}
      categories={categories}
      entryCounts={entryCounts}
      {...handlers}
      {...overrides}
    />,
  );

  return handlers;
}

describe("ManageCategoriesPopin", () => {
  it("renders nothing when closed", () => {
    renderPopin({ isOpen: false });
    expect(screen.queryByText("Manage Categories")).toBeNull();
  });

  it("renders a row per category with its entry count", () => {
    renderPopin();

    expect(screen.getByText("Manage Categories")).toBeDefined();
    expect(screen.getByText("Edit or remove your spending categories")).toBeDefined();
    expect(screen.getByText("Groceries")).toBeDefined();
    expect(screen.getByText("5 entries")).toBeDefined();
    expect(screen.getByText("Transport")).toBeDefined();
    expect(screen.getByText("1 entry")).toBeDefined();
  });

  it("shows '0 entries' for a category with no count", () => {
    renderPopin();

    // "Dining" has no key in entryCounts.
    expect(screen.getByText("0 entries")).toBeDefined();
  });

  it("filters rows case-insensitively as the user types", () => {
    renderPopin();
    const input = screen.getByPlaceholderText("Search categories");

    fireEvent.change(input, { target: { value: "GRO" } });

    expect(screen.getByText("Groceries")).toBeDefined();
    expect(screen.queryByText("Transport")).toBeNull();
    expect(screen.queryByText("Dining")).toBeNull();
  });

  it("restores the full list when the search is cleared", () => {
    renderPopin();
    const input = screen.getByPlaceholderText("Search categories");

    fireEvent.change(input, { target: { value: "gro" } });
    fireEvent.change(input, { target: { value: "" } });

    expect(screen.getByText("Groceries")).toBeDefined();
    expect(screen.getByText("Transport")).toBeDefined();
    expect(screen.getByText("Dining")).toBeDefined();
  });

  it("shows the empty state when nothing matches", () => {
    renderPopin();
    const input = screen.getByPlaceholderText("Search categories");

    fireEvent.change(input, { target: { value: "zzz" } });

    expect(screen.getByText("No categories found")).toBeDefined();
    expect(screen.queryByText("Groceries")).toBeNull();
  });

  it("fires onEditCategory with the clicked row's category", () => {
    const { onEditCategory } = renderPopin();

    fireEvent.click(screen.getByRole("button", { name: "Edit Transport" }));

    expect(onEditCategory).toHaveBeenCalledTimes(1);
    expect(onEditCategory).toHaveBeenCalledWith(categories[1]);
  });

  it("fires onDeleteCategory with the clicked row's category", () => {
    const { onDeleteCategory } = renderPopin();

    fireEvent.click(screen.getByRole("button", { name: "Delete Groceries" }));

    expect(onDeleteCategory).toHaveBeenCalledTimes(1);
    expect(onDeleteCategory).toHaveBeenCalledWith(categories[0]);
  });

  it("fires onNewCategory from the footer CTA", () => {
    const { onNewCategory } = renderPopin();

    fireEvent.click(screen.getByRole("button", { name: /New Category/ }));

    expect(onNewCategory).toHaveBeenCalledTimes(1);
  });
});
