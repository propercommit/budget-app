// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DeleteCategoryDialog } from "@/components/category/popins/delete-category-dialog";
import type { Category } from "@/lib/types";

const category: Category = { id: "c1", label: "Groceries", icon: "shopping-cart", color: "#34C759" };

function renderDialog(overrides: Partial<Parameters<typeof DeleteCategoryDialog>[0]> = {}) {

  const handlers = {
    onCancel: vi.fn(),
    onConfirm: vi.fn().mockResolvedValue(undefined),
  };

  render(<DeleteCategoryDialog category={category} {...handlers} {...overrides} />);

  return handlers;
}

describe("DeleteCategoryDialog", () => {
  it("names the category and states the cascade consequence", () => {
    renderDialog();

    expect(screen.getByText('Delete "Groceries"?')).toBeDefined();
    expect(
      screen.getByText("Are you sure? This will delete all spending items in this category. This cannot be undone.")
    ).toBeDefined();
  });

  it("fires onCancel from the Cancel button", () => {
    const { onCancel, onConfirm } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("fires onCancel from a backdrop click", () => {
    const { onCancel } = renderDialog();

    const backdrop = screen.getByRole("alertdialog").firstElementChild;

    fireEvent.click(backdrop as Element);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("runs onConfirm and disables both buttons while it is pending", async () => {

    let resolveConfirm!: () => void;
    const pending = new Promise<void>((r) => { resolveConfirm = r; });
    const onConfirm = vi.fn().mockReturnValue(pending);
    const { onCancel } = renderDialog({ onConfirm });

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Delete" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveProperty("disabled", true);

    // Neither Cancel nor the backdrop can dismiss the dialog mid-delete.
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("alertdialog").firstElementChild as Element);
    expect(onCancel).not.toHaveBeenCalled();

    resolveConfirm();

    await waitFor(() => expect(screen.getByRole("button", { name: "Delete" })).toHaveProperty("disabled", false));
  });
});
