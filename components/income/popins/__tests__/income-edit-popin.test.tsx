// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IncomePopin } from "@/components/income/popins/income-edit-popin";
import { SettingsProvider } from "@/lib/settings-context";

function renderPopin() {

    const onSave = vi.fn();

    render(
        <SettingsProvider>
            <IncomePopin isOpen={true} onClose={() => {}} onSave={onSave} mode="add" />
        </SettingsProvider>,
    );

    return { onSave };
}

describe("IncomePopin — submit-reveal validation", () => {
    it("keeps the save button enabled and reveals all field messages on an empty submit", () => {

        const { onSave } = renderPopin();

        const saveButton = screen.getByRole("button", { name: "Add Income" });

        expect(saveButton).not.toBeDisabled();

        fireEvent.click(saveButton);

        expect(onSave).not.toHaveBeenCalled();

        expect(screen.getByText("Enter a name")).toBeInTheDocument();

        expect(screen.getByText("Enter an amount")).toBeInTheDocument();

        expect(screen.getByText("Choose a start date")).toBeInTheDocument();
    });

    it("shows no errors while typing a fresh form", () => {

        renderPopin();

        fireEvent.change(screen.getByPlaceholderText("e.g., Monthly Salary"), { target: { value: "S" } });

        expect(screen.queryByText("Enter a name")).toBeNull();

        expect(screen.queryByText("Enter an amount")).toBeNull();
    });

    it("wires aria-invalid and aria-describedby on the errored input, and focuses the first one", () => {

        renderPopin();

        fireEvent.click(screen.getByRole("button", { name: "Add Income" }));

        const nameInput = screen.getByPlaceholderText("e.g., Monthly Salary");

        expect(nameInput).toHaveAttribute("aria-invalid", "true");

        expect(nameInput).toHaveAttribute("aria-describedby", "income-name-error");

        expect(nameInput).toHaveFocus();
    });

    it("clears a field's error as soon as it is fixed, leaving the others", () => {

        renderPopin();

        fireEvent.click(screen.getByRole("button", { name: "Add Income" }));

        fireEvent.change(screen.getByPlaceholderText("e.g., Monthly Salary"), { target: { value: "Salary" } });

        expect(screen.queryByText("Enter a name")).toBeNull();

        expect(screen.getByText("Enter an amount")).toBeInTheDocument();
    });

    it("distinguishes a zero amount from a malformed one", () => {

        renderPopin();

        const amountInput = screen.getByPlaceholderText("0.00");

        fireEvent.change(amountInput, { target: { value: "0" } });

        fireEvent.click(screen.getByRole("button", { name: "Add Income" }));

        expect(screen.getByText("Enter an amount")).toBeInTheDocument();

        fireEvent.change(amountInput, { target: { value: "12." } });

        expect(screen.getByText("Enter a valid amount, like 2500 or 49.90")).toBeInTheDocument();
    });

    it("saves once every field is valid", () => {

        const { onSave } = renderPopin();

        fireEvent.click(screen.getByRole("button", { name: "Add Income" }));

        fireEvent.change(screen.getByPlaceholderText("e.g., Monthly Salary"), { target: { value: "Salary" } });

        fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "2500" } });

        const dateInputs = document.querySelectorAll<HTMLInputElement>('input[type="date"]');

        fireEvent.change(dateInputs[0], { target: { value: "2026-07-01" } });

        fireEvent.click(screen.getByRole("button", { name: "Add Income" }));

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({ name: "Salary", amount: 250000, type: "active" }),
        );
    });
});
