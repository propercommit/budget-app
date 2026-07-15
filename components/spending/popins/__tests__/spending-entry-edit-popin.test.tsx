// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { EntryEditPopin } from "@/components/spending/popins/spending-entry-edit-popin";
import type { SpendingEntry } from "@/components/spending/spending-card-expanded";
import { SettingsProvider } from "@/lib/settings-context";
import { prepareReceiptFile } from "@/lib/receipt-file";

// Only the runtime export is mocked — ReceiptAction/PreparedReceipt are
// type-only exports, erased at compile time, so the real union still types
// the mock's resolved values below.
vi.mock("@/lib/receipt-file", () => ({
    prepareReceiptFile: vi.fn(),
}));

const prepareReceiptFileMock = vi.mocked(prepareReceiptFile);

// jsdom has no object-URL support; stub the statics onto the real URL class
// so `new URL(...)` elsewhere keeps working.
const createObjectURLMock = vi.fn(() => "blob:fake-preview");
const revokeObjectURLMock = vi.fn();

beforeAll(() => {
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: createObjectURLMock, revokeObjectURL: revokeObjectURLMock }));
});

beforeEach(() => {
    prepareReceiptFileMock.mockReset();

    createObjectURLMock.mockClear();

    revokeObjectURLMock.mockClear();
});

// The harness has no settings API, so SettingsProvider falls back to USD —
// the sign preview therefore reads "−$" (debit) / "+$" (credit).
const DEBIT_PREFIX = "−$";
const CREDIT_PREFIX = "+$";

const creditEntry: SpendingEntry = { id: "e1", name: "Refund", date: "2026-06-10", amount: 4200, direction: "credit", receiptPath: null, link: null };

const debitEntry: SpendingEntry = { id: "e2", name: "Coffee", date: "2026-06-05", amount: 10000, direction: "debit", receiptPath: null, link: null };

const receiptEntry: SpendingEntry = { id: "e3", name: "Pharmacy", date: "2026-06-12", amount: 2500, direction: "debit", receiptPath: "user-1/e3", link: null };

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
            receipt: { action: "keep" },
            link: null,
        });
    });

    it("auto-prefixes https:// on a scheme-less link in the payload", () => {

        const { onSave } = renderPopin();

        fireEvent.change(screen.getByPlaceholderText("e.g., Shell Station, Grocery run"), { target: { value: "Groceries" } });

        fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "12" } });

        fireEvent.change(screen.getByPlaceholderText("https://example.com"), { target: { value: "migros.ch" } });

        fireEvent.click(screen.getByRole("button", { name: "Add Entry" }));

        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ link: "https://migros.ch" }));
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
            receipt: { action: "keep" },
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
            receipt: { action: "keep" },
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
            receipt: { action: "keep" },
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

describe("EntryEditPopin — receipt field", () => {

    const rawFile = new File(["raw-bytes"], "receipt.jpg", { type: "image/jpeg" });

    /** The hidden file input inside the "Upload receipt" dropzone label. */
    const fileInput = () => screen.getByLabelText("Upload receipt (max 10 MB)");

    const selectFile = (file: File) => fireEvent.change(fileInput(), { target: { files: [file] } });

    it("stages a prepared file and sends attach in the save payload", async () => {

        const preparedFile = new File(["compressed"], "receipt.jpg", { type: "image/jpeg" });

        prepareReceiptFileMock.mockResolvedValue({ kind: "ready", file: preparedFile });

        const { onSave } = renderPopin();

        fireEvent.change(screen.getByPlaceholderText("e.g., Shell Station, Grocery run"), { target: { value: "Coffee" } });

        fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "4.50" } });

        selectFile(rawFile);

        // The staged preview renders from the (stubbed) object URL of the
        // PREPARED file — what the save payload must carry, not the raw one.
        const preview = await screen.findByAltText("Receipt preview");

        expect(preview).toHaveAttribute("src", "blob:fake-preview");

        expect(createObjectURLMock).toHaveBeenCalledWith(preparedFile);

        fireEvent.click(screen.getByRole("button", { name: "Add Entry" }));

        expect(onSave).toHaveBeenCalledWith({
            name: "Coffee",
            amount: 450,
            direction: "debit",
            date: new Date().toISOString().split("T")[0],
            receipt: { action: "attach", file: preparedFile },
            link: null,
        });
    });

    it("sends remove after Remove is clicked on a stored receipt", () => {

        const { onSave } = renderPopin({ mode: "edit", entry: receiptEntry });

        // A stored receipt renders as a static placeholder — no network read.
        expect(screen.getByText("Receipt attached")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Remove" }));

        expect(screen.queryByText("Receipt attached")).toBeNull();

        fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

        expect(onSave).toHaveBeenCalledWith({
            name: "Pharmacy",
            amount: 2500,
            direction: "debit",
            date: "2026-06-12",
            receipt: { action: "remove" },
            link: null,
        });
    });

    it("blocks save while the selected file is still processing", () => {

        prepareReceiptFileMock.mockReturnValue(new Promise(() => {}));

        const { onSave } = renderPopin();

        fireEvent.change(screen.getByPlaceholderText("e.g., Shell Station, Grocery run"), { target: { value: "Coffee" } });

        fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "4.50" } });

        selectFile(rawFile);

        fireEvent.click(screen.getByRole("button", { name: "Add Entry" }));

        expect(onSave).not.toHaveBeenCalled();

        expect(screen.getByText("Still processing the image — one moment")).toBeInTheDocument();
    });

    it("re-fires the handler when the same file is reselected after a failure", async () => {

        prepareReceiptFileMock.mockResolvedValue({ kind: "unsupported-type" });

        renderPopin();

        selectFile(rawFile);

        await screen.findByText("Use a JPEG, PNG or WebP image");

        // The input value is reset after every selection, so dispatching a
        // change with the SAME file is not a dead end.
        selectFile(rawFile);

        await waitFor(() => expect(prepareReceiptFileMock).toHaveBeenCalledTimes(2));
    });

    it("rejects an oversized file up front and never saves an attach", async () => {

        prepareReceiptFileMock.mockResolvedValue({ kind: "too-large" });

        const { onSave } = renderPopin();

        fireEvent.change(screen.getByPlaceholderText("e.g., Shell Station, Grocery run"), { target: { value: "Coffee" } });

        fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "4.50" } });

        selectFile(rawFile);

        await screen.findByText("Receipts can be at most 10 MB");

        fireEvent.click(screen.getByRole("button", { name: "Add Entry" }));

        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ receipt: { action: "keep" } }));
    });

    it("revokes the staged preview's object URL when the selection is discarded", async () => {

        const preparedFile = new File(["compressed"], "receipt.jpg", { type: "image/jpeg" });

        prepareReceiptFileMock.mockResolvedValue({ kind: "ready", file: preparedFile });

        renderPopin();

        selectFile(rawFile);

        await screen.findByAltText("Receipt preview");

        expect(revokeObjectURLMock).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole("button", { name: "Remove" }));

        expect(screen.queryByAltText("Receipt preview")).toBeNull();

        expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:fake-preview");
    });
});
