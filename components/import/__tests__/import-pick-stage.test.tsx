// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ImportPickStage } from "@/components/import/import-pick-stage";

const MT940_CONTENT = ":20:STMT-REF\n:60F:C260601CHF1000,00\n:62F:C260630CHF1000,00\n-";

/**
 * Emulates the browser's LIVE FileList contract, which RTL's
 * `fireEvent.change(input, { target: { files } })` cannot: in a real browser
 * `input.files` keeps returning the same FileList object, and resetting
 * `input.value = ""` empties that object in place — so a handler that captures
 * the list, resets the value, and only then reads `files[0]` finds nothing.
 * (Verified against real Chromium. RTL's `target` option installs a plain
 * array own-property that survives the reset, which is why the popin suite
 * never saw the bug.)
 */
function stubLiveFileInput(input: HTMLInputElement, file: File): void {

    const list: File[] = [file];

    Object.defineProperty(input, "files", { configurable: true, get: () => list });

    Object.defineProperty(input, "value", {
        configurable: true,
        get: () => (list.length > 0 ? `C:\\fakepath\\${list[0].name}` : ""),
        set: (next: string) => {
            if (next === "") list.length = 0;
        },
    });
}

describe("ImportPickStage — file dialog (click) path", () => {

    it("delivers a file picked via the dialog to onPick", async () => {

        const onPick = vi.fn();
        const { container } = render(<ImportPickStage file={null} error={null} onPick={onPick} onRemove={vi.fn()} />);

        const input = container.querySelector('input[type="file"]') as HTMLInputElement;

        stubLiveFileInput(input, new File([MT940_CONTENT], "statement.mt940", { type: "text/plain" }));
        fireEvent.change(input);

        await waitFor(() => expect(onPick).toHaveBeenCalledTimes(1));

        expect(onPick).toHaveBeenCalledWith({ name: "statement.mt940", kb: 1, content: MT940_CONTENT });
    });

    it("resets the input after a pick so re-selecting the same file works", async () => {

        const onPick = vi.fn();
        const { container } = render(<ImportPickStage file={null} error={null} onPick={onPick} onRemove={vi.fn()} />);

        const input = container.querySelector('input[type="file"]') as HTMLInputElement;

        stubLiveFileInput(input, new File([MT940_CONTENT], "statement.mt940", { type: "text/plain" }));
        fireEvent.change(input);

        await waitFor(() => expect(onPick).toHaveBeenCalledTimes(1));

        // The value reset is what makes a real browser fire `change` again
        // for the same file — without it a re-pick is a silent dead end.
        expect(input.value).toBe("");

        // The browser re-selecting the same file = a fresh selection + change.
        stubLiveFileInput(input, new File([MT940_CONTENT], "statement.mt940", { type: "text/plain" }));
        fireEvent.change(input);

        await waitFor(() => expect(onPick).toHaveBeenCalledTimes(2));
    });

    it("delivers a dropped file through the same pipeline", async () => {

        const onPick = vi.fn();
        render(<ImportPickStage file={null} error={null} onPick={onPick} onRemove={vi.fn()} />);

        const zone = screen.getByRole("button", { name: /drop your bank statement here/i });

        fireEvent.drop(zone, { dataTransfer: { files: [new File([MT940_CONTENT], "statement.mt940", { type: "text/plain" })] } });

        await waitFor(() => expect(onPick).toHaveBeenCalledTimes(1));

        expect(onPick).toHaveBeenCalledWith({ name: "statement.mt940", kb: 1, content: MT940_CONTENT });
    });
});
