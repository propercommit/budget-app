// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ComponentProps } from "react";
import { EntryEditPopin } from "@/components/spending/popins/spending-entry-edit-popin";
import type { SpendingEntry } from "@/components/spending/spending-card-expanded";
import { SettingsProvider } from "@/lib/settings-context";

// The harness has no settings API, so SettingsProvider falls back to USD —
// the sign preview therefore reads "−$" (debit) / "+$" (credit).
const DEBIT_PREFIX = "−$";
const CREDIT_PREFIX = "+$";

const creditEntry: SpendingEntry = { id: "e1", name: "Refund", date: "2026-06-10", amount: 4200, direction: "credit", receipt: null, link: null };

const debitEntry: SpendingEntry = { id: "e2", name: "Coffee", date: "2026-06-05", amount: 10000, direction: "debit", receipt: null, link: null };

type PopinProps = ComponentProps<typeof EntryEditPopin>;

function renderPopin(overrides: Partial<PopinProps> = {}) {

    const onSave = vi.fn();

    render(
        <SettingsProvider>
            <EntryEditPopin
                isOpen={true}
                onClose={() => {}}
                onSave={onSave}
                mode="create"
                entry={null}
                spendingName="Groceries"
                spendingItemIcon="shopping-cart"
                spendingCategoryName="Food"
                spendingCategoryColor="#34C759"
                {...overrides}
            />
        </SettingsProvider>,
    );

    return { onSave };
}

describe("EntryEditPopin — direction control", () => {
    it("defaults to Debit on create with a red − sign preview", () => {

        renderPopin();

        const prefix = screen.getByText(DEBIT_PREFIX);

        expect(prefix).toBeInTheDocument();

        expect(prefix).toHaveStyle({ color: "#FF3B30" });

        expect(screen.queryByText(CREDIT_PREFIX)).toBeNull();
    });

    it("sends direction debit in the create payload without touching the toggle", () => {

        const { onSave } = renderPopin();

        fireEvent.change(screen.getByPlaceholderText("e.g., Shell Station, Grocery run"), { target: { value: "Coffee" } });

        fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "4.50" } });

        fireEvent.click(screen.getByRole("button", { name: "Add Entry" }));

        expect(onSave).toHaveBeenCalledWith({
            name: "Coffee",
            amount: 450,
            direction: "debit",
            date: new Date().toISOString().split("T")[0],
            receipt: null,
            link: null,
        });
    });

    it("preloads Credit when editing a credit entry and keeps it in the payload", () => {

        const { onSave } = renderPopin({ mode: "edit", entry: creditEntry });

        expect(screen.getByText(CREDIT_PREFIX)).toHaveStyle({ color: "#34C759" });

        fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

        expect(onSave).toHaveBeenCalledWith({
            name: "Refund",
            amount: 4200,
            direction: "credit",
            date: "2026-06-10",
            receipt: null,
            link: null,
        });
    });

    it("toggling updates the sign preview immediately", () => {

        renderPopin();

        fireEvent.click(screen.getByRole("button", { name: "Credit" }));

        expect(screen.getByText(CREDIT_PREFIX)).toHaveStyle({ color: "#34C759" });

        expect(screen.queryByText(DEBIT_PREFIX)).toBeNull();

        fireEvent.click(screen.getByRole("button", { name: "Debit" }));

        expect(screen.getByText(DEBIT_PREFIX)).toHaveStyle({ color: "#FF3B30" });

        expect(screen.queryByText(CREDIT_PREFIX)).toBeNull();
    });

    it("saves the toggled direction in create mode", () => {

        const { onSave } = renderPopin();

        fireEvent.change(screen.getByPlaceholderText("e.g., Shell Station, Grocery run"), { target: { value: "Store refund" } });

        fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "10" } });

        fireEvent.click(screen.getByRole("button", { name: "Credit" }));

        fireEvent.click(screen.getByRole("button", { name: "Add Entry" }));

        expect(onSave).toHaveBeenCalledWith({
            name: "Store refund",
            amount: 1000,
            direction: "credit",
            date: new Date().toISOString().split("T")[0],
            receipt: null,
            link: null,
        });
    });

    it("flips an existing debit entry to credit in the edit payload", () => {

        const { onSave } = renderPopin({ mode: "edit", entry: debitEntry });

        fireEvent.click(screen.getByRole("button", { name: "Credit" }));

        fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

        expect(onSave).toHaveBeenCalledWith({
            name: "Coffee",
            amount: 10000,
            direction: "credit",
            date: "2026-06-05",
            receipt: null,
            link: null,
        });
    });
});

describe("EntryEditPopin — amount input guard", () => {
    it("accepts at most two decimals and rejects non-numeric input", () => {

        renderPopin();

        const input = screen.getByPlaceholderText("0.00");

        fireEvent.change(input, { target: { value: "12.34" } });

        expect(input).toHaveValue("12.34");

        fireEvent.change(input, { target: { value: "12.345" } });

        expect(input).toHaveValue("12.34");

        fireEvent.change(input, { target: { value: "abc" } });

        expect(input).toHaveValue("12.34");

        fireEvent.change(input, { target: { value: "" } });

        expect(input).toHaveValue("");
    });
});
