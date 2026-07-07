// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PickerModal } from "@/components/account/components/modals/picker-modal";

const OPTIONS = [
    { value: "USD", label: "USD ($)" },
    { value: "EUR", label: "EUR (€)" },
    { value: "CHF", label: "CHF (CHF)" },
] as const;

function renderPicker(overrides: Partial<Parameters<typeof PickerModal<string>>[0]> = {}) {

    const handlers = {
        onClose: vi.fn(),
        onSelect: vi.fn(),
    };

    render(
        <PickerModal
            isOpen={true}
            title="Currency"
            options={OPTIONS}
            selected="USD"
            {...handlers}
            {...overrides}
        />
    );

    return handlers;
}

describe("PickerModal", () => {
    it("renders nothing while closed", () => {
        renderPicker({ isOpen: false });

        expect(screen.queryByText("Currency")).toBeNull();
    });

    it("renders the title and every option", () => {
        renderPicker();

        expect(screen.getByText("Currency")).toBeDefined();

        expect(screen.getAllByRole("option")).toHaveLength(3);
    });

    it("marks only the selected option", () => {
        renderPicker({ selected: "EUR" });

        expect(screen.getByRole("option", { name: "EUR (€)", selected: true })).toBeDefined();

        expect(screen.getAllByRole("option", { selected: false })).toHaveLength(2);
    });

    it("reports the picked value and closes", () => {
        const { onSelect, onClose } = renderPicker();

        fireEvent.click(screen.getByRole("option", { name: "CHF (CHF)" }));

        expect(onSelect).toHaveBeenCalledWith("CHF");

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("closes without selecting from Cancel", () => {
        const { onSelect, onClose } = renderPicker();

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(onClose).toHaveBeenCalledTimes(1);

        expect(onSelect).not.toHaveBeenCalled();
    });
});
