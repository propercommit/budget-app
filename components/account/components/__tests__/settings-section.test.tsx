// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsSection, SettingsRow } from "@/components/account/components/settings-section";

describe("SettingsSection", () => {
    it("renders the caption and its rows", () => {
        render(
            <SettingsSection title="Preferences">
                <SettingsRow label="Currency" detail="USD ($)" onClick={vi.fn()} />
            </SettingsSection>
        );

        expect(screen.getByRole("heading", { name: "Preferences" })).toBeDefined();

        expect(screen.getByRole("button", { name: /Currency/ })).toBeDefined();
    });
});

describe("SettingsRow", () => {
    it("shows the label with its current value and fires onClick", () => {

        const onClick = vi.fn();

        render(<SettingsRow label="Email" detail="user@example.com" onClick={onClick} />);

        expect(screen.getByText("Email")).toBeDefined();

        expect(screen.getByText("user@example.com")).toBeDefined();

        fireEvent.click(screen.getByRole("button"));

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("renders a description line when given", () => {
        render(<SettingsRow label="Export Your Data" description="Download all your budget data as CSV" />);

        expect(screen.getByText("Download all your budget data as CSV")).toBeDefined();
    });
});
