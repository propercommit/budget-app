// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeleteModal } from "@/components/account/components/modals/delete-modal";

function renderModal(overrides: Partial<Parameters<typeof DeleteModal>[0]> = {}) {

    const handlers = {
        onClose: vi.fn(),
        onConfirmTextChange: vi.fn(),
        onPasswordChange: vi.fn(),
        onSubmit: vi.fn(),
    };

    render(
        <DeleteModal
            isOpen={true}
            confirmText=""
            password=""
            error={null}
            isSaving={false}
            {...handlers}
            {...overrides}
        />
    );

    return handlers;
}

describe("DeleteModal", () => {
    it("keeps the Delete action disabled until the exact confirmation is typed", () => {
        renderModal({ confirmText: "delete" });

        expect(screen.getByRole("button", { name: "Delete" })).toHaveProperty("disabled", true);
    });

    it("arms the Delete action once DELETE is typed", () => {
        const { onSubmit } = renderModal({ confirmText: "DELETE" });

        const deleteButton = screen.getByRole("button", { name: "Delete" });

        expect(deleteButton).toHaveProperty("disabled", false);

        fireEvent.click(deleteButton);

        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("forwards typing in the confirmation field", () => {
        const { onConfirmTextChange } = renderModal();

        fireEvent.change(screen.getByPlaceholderText("Type DELETE to confirm"), { target: { value: "DEL" } });

        expect(onConfirmTextChange).toHaveBeenCalledWith("DEL");
    });

    it("asks password users to re-authenticate", () => {
        renderModal();

        expect(screen.getByPlaceholderText("Your password")).toBeDefined();
    });

    it("hides the password field for Google users", () => {
        renderModal({ isGoogleUser: true });

        expect(screen.queryByPlaceholderText("Your password")).toBeNull();
    });

    it("surfaces a submit error", () => {
        renderModal({ error: "Incorrect password" });

        expect(screen.getByText("Incorrect password")).toBeDefined();
    });

    it("closes from Cancel without submitting", () => {
        const { onClose, onSubmit } = renderModal({ confirmText: "DELETE" });

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(onClose).toHaveBeenCalledTimes(1);

        expect(onSubmit).not.toHaveBeenCalled();
    });
});
