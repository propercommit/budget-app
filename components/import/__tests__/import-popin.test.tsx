// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/lib/api", () => ({
    previewImport: vi.fn(),
    commitImport: vi.fn(),
    getCategories: vi.fn(),
}));

import * as api from "@/lib/api";
import { ImportPopin } from "@/components/import/import-popin";
import type { PreviewResponse } from "@/lib/import/review";
import type { BankTransaction, ReconciliationResult } from "@/lib/import/types";

// --- fixtures ---------------------------------------------------------------

// Minimal content that satisfies mt940Parser.canParse (the real preview is mocked).
const MT940_CONTENT = ":20:STMT-REF\n:60F:C260601CHF1000,00\n:62F:C260630CHF1000,00\n-";

const CATEGORIES = [
    { id: "cat-food", label: "Food", icon: "utensils", color: "#ef4444" },
    { id: "cat-transport", label: "Transport", icon: "train", color: "#3b82f6" },
];

const reconciled = (over: Partial<ReconciliationResult> = {}): ReconciliationResult => ({
    reconciled: true,
    movement: -5430,
    expectedClosing: 94570,
    actualClosing: 94570,
    difference: 0,
    openingBalance: { direction: "credit", amount: 100000, currency: "CHF", date: "2026-06-01" },
    closingBalance: { direction: "credit", amount: 94570, currency: "CHF", date: "2026-06-30" },
    ...over,
});

const PREVIEW: PreviewResponse = {
    reconciliation: [reconciled()],
    transactions: [
        {
            tx: { date: "2026-06-03", amount: 5430, direction: "debit", description: "TWINT MIGROS ONLINE" },
            match: { tier: "unknown" },
            statementIndex: 0,
        },
        {
            tx: { date: "2026-06-04", amount: 1200, direction: "debit", description: "COOP PRONTO ZUERICH" },
            match: {
                tier: "confident",
                candidate: {
                    rule: { id: "rule-coop", match: "COOP", valueType: "spending", categoryId: "cat-food", useCount: 12 },
                    value: { type: "spending", categoryId: "cat-food" },
                    ruleId: "rule-coop",
                    destination: null,
                },
            },
            statementIndex: 0,
        },
    ],
};

const COMMIT_RESULT = { importId: "import-1", counts: { total: 2, imported: 2, excluded: 0, spending: 2, income: 0 } };

/** Drives the popin through file pick with the given content. */
async function pickFile(content: string, name = "june.mt940") {

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([content], name, { type: "text/plain" });

    fireEvent.change(input, { target: { files: [file] } });

    await screen.findByText(name);
}

async function continueToReview() {

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await screen.findByText("Needs your decision");
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.previewImport).mockResolvedValue(structuredClone(PREVIEW));
    vi.mocked(api.getCategories).mockResolvedValue(structuredClone(CATEGORIES));
    vi.mocked(api.commitImport).mockResolvedValue(structuredClone(COMMIT_RESULT));
});

describe("ImportPopin", () => {
    it("starts at the pick stage with Continue disabled until a file is chosen", async () => {
        render(<ImportPopin isOpen onClose={vi.fn()} />);

        expect(screen.getByText("Drop your bank statement here")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();

        await pickFile(MT940_CONTENT);

        expect(screen.getByText("1 KB · MT940 · ready to review")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    });

    it("rejects a non-MT940 file inline without calling the server", async () => {
        render(<ImportPopin isOpen onClose={vi.fn()} />);

        await pickFile("date,amount\n2026-01-01,12.50", "export.csv");

        fireEvent.click(screen.getByRole("button", { name: "Continue" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Unrecognized statement format (expected MT940)");
        expect(api.previewImport).not.toHaveBeenCalled();
    });

    it("returns to the pick stage with the server's message when staging fails", async () => {
        vi.mocked(api.previewImport).mockRejectedValue(new Error('Malformed :61: line: "x"'));

        render(<ImportPopin isOpen onClose={vi.fn()} />);

        await pickFile(MT940_CONTENT);

        fireEvent.click(screen.getByRole("button", { name: "Continue" }));

        expect(await screen.findByRole("alert")).toHaveTextContent('Malformed :61: line: "x"');

        // Back on the pick stage with the file still selected for a retry.
        expect(screen.getByText("Choose a different file")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    });

    it("walks pick → review → success, committing confirmation and learned-rule fates", async () => {
        const onClose = vi.fn();

        render(<ImportPopin isOpen onClose={onClose} />);

        await pickFile(MT940_CONTENT);
        await continueToReview();

        expect(api.previewImport).toHaveBeenCalledWith(MT940_CONTENT);

        // One unknown gates the confirm; the matched row does not.
        expect(screen.getByText("1 left")).toBeInTheDocument();
        expect(screen.getByText("1 of 2 resolved")).toBeInTheDocument();
        expect(screen.getByText("Statement reconciles")).toBeInTheDocument();

        const confirm = screen.getByRole("button", { name: "Confirm import (2)" });

        expect(confirm).toBeDisabled();

        // Assign the unknown to Food — the row resolves and the rule chip opens.
        fireEvent.click(screen.getByRole("radio", { name: "Food" }));

        expect(screen.getByText("All done ✓")).toBeInTheDocument();
        expect(screen.getByText(/next time\?/)).toBeInTheDocument();

        // The pre-selected token skips noise (TWINT, ONLINE) and lands on MIGROS.
        fireEvent.click(screen.getByRole("button", { name: "Save rule" }));

        expect(screen.getByText("Will auto-categorize MIGROS → Food")).toBeInTheDocument();

        expect(confirm).toBeEnabled();

        fireEvent.click(confirm);

        await screen.findByText("2 entries imported");

        expect(api.commitImport).toHaveBeenCalledTimes(1);

        const payload = vi.mocked(api.commitImport).mock.calls[0][0];

        expect(payload.filename).toBe("june.mt940");
        expect(payload.statementStart).toBe("2026-06-01");
        expect(payload.statementEnd).toBe("2026-06-30");
        expect(payload.transactions[0].fate).toEqual({ kind: "route", value: { type: "spending", categoryId: "cat-food" }, learnKey: "MIGROS" });
        expect(payload.transactions[1].fate).toEqual({ kind: "route", value: { type: "spending", categoryId: "cat-food" }, ruleId: "rule-coop" });

        // Success summary carries the learned-rules receipt; Done closes.
        expect(screen.getByText("1 rule learned")).toBeInTheDocument();
        expect(screen.getByText("June 2026 · 1 category · 0 excluded")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Done" }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("leaves a transaction out as an excluded skip and counts it down", async () => {
        render(<ImportPopin isOpen onClose={vi.fn()} />);

        await pickFile(MT940_CONTENT);
        await continueToReview();

        fireEvent.click(screen.getByRole("button", { name: "Leave out" }));

        expect(screen.getByText("Left out — this one won’t be imported.")).toBeInTheDocument();
        expect(screen.getByText("Left out this import only", { exact: false })).toBeInTheDocument();

        const confirm = screen.getByRole("button", { name: "Confirm import (1)" });

        fireEvent.click(confirm);

        await waitFor(() => expect(api.commitImport).toHaveBeenCalledTimes(1));

        expect(vi.mocked(api.commitImport).mock.calls[0][0].transactions[0].fate).toEqual({ kind: "skip" });
    });

    it("gates a non-reconciling statement behind the import-anyway override", async () => {
        vi.mocked(api.previewImport).mockResolvedValue({
            ...structuredClone(PREVIEW),
            reconciliation: [reconciled({ reconciled: false, actualClosing: 96070, difference: -1500 })],
        });

        render(<ImportPopin isOpen onClose={vi.fn()} />);

        await pickFile(MT940_CONTENT);
        await continueToReview();

        expect(screen.getByText("Doesn’t reconcile")).toBeInTheDocument();
        expect(screen.getByText(/off by 15\.00 CHF/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole("radio", { name: "Food" }));

        expect(screen.getByRole("button", { name: "Confirm import (2)" })).toBeDisabled();
        expect(screen.getByText("Tick “Import anyway” above to confirm despite the mismatch")).toBeInTheDocument();

        fireEvent.click(screen.getByText("Import anyway — I’ll sort it out manually"));

        expect(screen.getByRole("button", { name: "Confirm import (2)" })).toBeEnabled();
    });

    it("rejects an oversized file at the pick gate, before any review work", async () => {
        vi.mocked(api.previewImport).mockResolvedValue({
            reconciliation: [reconciled()],
            transactions: Array.from({ length: 1001 }, (_, index) => ({
                tx: { date: "2026-06-03", amount: 100, direction: "debit" as const, description: `TX ${index}` },
                match: { tier: "unknown" as const },
                statementIndex: 0,
            })),
        });

        render(<ImportPopin isOpen onClose={vi.fn()} />);

        await pickFile(MT940_CONTENT);

        fireEvent.click(screen.getByRole("button", { name: "Continue" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("the limit is 1000 per import");
        expect(screen.queryByText("Needs your decision")).toBeNull();
    });

    it("offers only exclusion for a text-less line the server could never name", async () => {
        vi.mocked(api.previewImport).mockResolvedValue({
            reconciliation: [reconciled()],
            transactions: [
                { tx: { date: "2026-06-03", amount: 900, direction: "debit", description: "" }, match: { tier: "unknown" }, statementIndex: 0 },
            ],
        });

        render(<ImportPopin isOpen onClose={vi.fn()} />);

        await pickFile(MT940_CONTENT);
        await continueToReview();

        expect(screen.getByText("(no description)")).toBeInTheDocument();
        expect(screen.getByText("This line has no text to name an entry from — it can only be left out.")).toBeInTheDocument();
        expect(screen.queryByRole("radio")).toBeNull();
        expect(screen.getByRole("button", { name: "Leave out" })).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Leave out" }));

        expect(screen.getByRole("button", { name: "Confirm import (0)" })).toBeEnabled();
    });

    it("keeps the review open and surfaces the server error when the commit fails", async () => {
        vi.mocked(api.commitImport).mockRejectedValue(new Error("A budget line name collision prevented this import — please retry"));

        render(<ImportPopin isOpen onClose={vi.fn()} />);

        await pickFile(MT940_CONTENT);
        await continueToReview();

        fireEvent.click(screen.getByRole("radio", { name: "Food" }));

        fireEvent.click(screen.getByRole("button", { name: "Confirm import (2)" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("A budget line name collision prevented this import — please retry");
        expect(screen.getByRole("button", { name: "Confirm import (2)" })).toBeInTheDocument();
    });
});

// --- session cascade (one decision applies to all matching unknowns) --------

const unknownTx = (description: string, over: Partial<BankTransaction> = {}) => ({
    tx: { date: "2026-06-03", amount: 900, direction: "debit" as const, description, ...over },
    match: { tier: "unknown" as const },
    statementIndex: 0,
});

describe("ImportPopin — session cascade", () => {
    it("one confirm resolves every matching unknown (5-SBB case), corrections stay per-row", async () => {
        vi.mocked(api.previewImport).mockResolvedValue({
            reconciliation: [reconciled()],
            transactions: [
                unknownTx("TWINT SBB EASYRIDE"),
                unknownTx("SBB CFF FFS BILLETT ZUERICH"),
                unknownTx("sbb mobile tickets"),
                unknownTx("PAYMENT 4711", { counterparty: "SBB AG" }),
                unknownTx("MIGROS ZUERICH"),
            ],
        });
        vi.mocked(api.commitImport).mockResolvedValue({ importId: "i1", counts: { total: 5, imported: 4, excluded: 1, spending: 4, income: 0 } });

        render(<ImportPopin isOpen onClose={vi.fn()} />);

        await pickFile(MT940_CONTENT);
        await continueToReview();

        // One decision on the first SBB row…
        fireEvent.click(screen.getAllByRole("radio", { name: "Transport" })[0]);

        fireEvent.click(screen.getByRole("button", { name: "Save rule" }));

        // …and the receipt says it swept the other three (incl. the
        // counterparty-only match), counts staying honest.
        expect(screen.getByText(/applied to 3 more transactions/)).toBeInTheDocument();
        expect(screen.getByText("4 of 5 resolved")).toBeInTheDocument();
        expect(screen.getByText("1 left")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Confirm import (5)" })).toBeDisabled();

        // Correcting ONE cascaded row affects that row only (no un-cascade).
        fireEvent.click(screen.getAllByRole("button", { name: "Change" })[1]);

        fireEvent.click(screen.getAllByRole("radio", { name: "Food" })[0]);

        // Resolve the unrelated MIGROS row and commit.
        fireEvent.click(screen.getByRole("button", { name: "Leave out" }));

        fireEvent.click(screen.getByRole("button", { name: "Confirm import (4)" }));

        await screen.findByText("4 entries imported");

        const fates = vi.mocked(api.commitImport).mock.calls[0][0].transactions.map((entry) => entry.fate);

        expect(fates[0]).toEqual({ kind: "route", value: { type: "spending", categoryId: "cat-transport" }, learnKey: "SBB" });
        expect(fates[1]).toEqual({ kind: "route", value: { type: "spending", categoryId: "cat-food" }, learnKey: "SBB" });
        expect(fates[2]).toEqual({ kind: "route", value: { type: "spending", categoryId: "cat-transport" }, learnKey: "SBB" });
        expect(fates[3]).toEqual({ kind: "route", value: { type: "spending", categoryId: "cat-transport" }, learnKey: "SBB" });
        expect(fates[4]).toEqual({ kind: "skip" });
    });

    it("always-exclude sweeps every matching unknown into the excluded pile", async () => {
        vi.mocked(api.previewImport).mockResolvedValue({
            reconciliation: [reconciled()],
            transactions: [
                unknownTx("VISECA KREDITKARTE ABRECHNUNG"),
                unknownTx("VISECA CARD SERVICES"),
            ],
        });
        vi.mocked(api.commitImport).mockResolvedValue({ importId: "i1", counts: { total: 2, imported: 0, excluded: 2, spending: 0, income: 0 } });

        render(<ImportPopin isOpen onClose={vi.fn()} />);

        await pickFile(MT940_CONTENT);
        await continueToReview();

        fireEvent.click(screen.getAllByRole("button", { name: "Always exclude" })[0]);

        fireEvent.click(screen.getByRole("button", { name: "Save rule" }));

        expect(screen.getByText(/applied to 1 more transaction\b/)).toBeInTheDocument();
        expect(screen.getByText("2 of 2 resolved · 2 excluded")).toBeInTheDocument();

        const confirm = screen.getByRole("button", { name: "Confirm import (0)" });

        expect(confirm).toBeEnabled();

        fireEvent.click(confirm);

        await waitFor(() => expect(api.commitImport).toHaveBeenCalledTimes(1));

        const fates = vi.mocked(api.commitImport).mock.calls[0][0].transactions.map((entry) => entry.fate);

        expect(fates[0]).toEqual({ kind: "alwaysExclude", learnKey: "VISECA" });
        expect(fates[1]).toEqual({ kind: "alwaysExclude", learnKey: "VISECA" });
    });

    it("names the card from the chip — five SBB rows named 'Train' share one seriesName", async () => {
        vi.mocked(api.previewImport).mockResolvedValue({
            reconciliation: [reconciled()],
            transactions: [
                unknownTx("TWINT SBB EASYRIDE"),
                unknownTx("SBB CFF FFS BILLETT"),
                unknownTx("sbb mobile tickets"),
            ],
        });
        vi.mocked(api.commitImport).mockResolvedValue({ importId: "i1", counts: { total: 3, imported: 3, excluded: 0, spending: 3, income: 0 } });

        render(<ImportPopin isOpen onClose={vi.fn()} />);

        await pickFile(MT940_CONTENT);
        await continueToReview();

        fireEvent.click(screen.getAllByRole("radio", { name: "Transport" })[0]);

        // The naming line pre-fills from the selected token; the pencil turns
        // it into an input.
        expect(screen.getByText(/will appear as/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Rename card" }));

        const input = screen.getByRole("textbox", { name: "Card name" });

        expect(input).toHaveValue("SBB");

        fireEvent.change(input, { target: { value: "Train" } });

        fireEvent.keyDown(input, { key: "Enter" });

        fireEvent.click(screen.getByRole("button", { name: "Save rule" }));

        fireEvent.click(screen.getByRole("button", { name: "Confirm import (3)" }));

        await waitFor(() => expect(api.commitImport).toHaveBeenCalledTimes(1));

        const fates = vi.mocked(api.commitImport).mock.calls[0][0].transactions.map((entry) => entry.fate);

        for (const fate of fates) expect(fate).toEqual({ kind: "route", value: { type: "spending", categoryId: "cat-transport" }, learnKey: "SBB", seriesName: "Train" });
    });

    it("an unedited name sends no seriesName; an emptied edit falls back to the token", async () => {
        vi.mocked(api.previewImport).mockResolvedValue({
            reconciliation: [reconciled()],
            transactions: [unknownTx("TWINT SBB EASYRIDE")],
        });
        vi.mocked(api.commitImport).mockResolvedValue({ importId: "i1", counts: { total: 1, imported: 1, excluded: 0, spending: 1, income: 0 } });

        render(<ImportPopin isOpen onClose={vi.fn()} />);

        await pickFile(MT940_CONTENT);
        await continueToReview();

        fireEvent.click(screen.getByRole("radio", { name: "Transport" }));

        // Edit, then empty the input: the name falls back to the token —
        // the UI cannot produce an invalid fate.
        fireEvent.click(screen.getByRole("button", { name: "Rename card" }));

        const input = screen.getByRole("textbox", { name: "Card name" });

        fireEvent.change(input, { target: { value: "   " } });

        fireEvent.keyDown(input, { key: "Enter" });

        expect(screen.getByText(/will appear as/)).toBeInTheDocument();

        // Fallback happened: both the question line and the naming line show
        // the token again.
        expect(screen.getAllByText("SBB", { selector: "b" })).toHaveLength(2);

        fireEvent.click(screen.getByRole("button", { name: "Save rule" }));

        fireEvent.click(screen.getByRole("button", { name: "Confirm import (1)" }));

        await waitFor(() => expect(api.commitImport).toHaveBeenCalledTimes(1));

        expect(vi.mocked(api.commitImport).mock.calls[0][0].transactions[0].fate).not.toHaveProperty("seriesName");
    });

    it("never cascades into suggested rows — they keep their server-rule confirmation", async () => {
        vi.mocked(api.previewImport).mockResolvedValue({
            reconciliation: [reconciled()],
            transactions: [
                unknownTx("TWINT SBB EASYRIDE"),
                {
                    tx: { date: "2026-06-05", amount: 340, direction: "debit" as const, description: "SBB HALBTAX ABO" },
                    match: {
                        tier: "suggested" as const,
                        candidates: [{
                            rule: { id: "rule-sbb", match: "SBB", valueType: "spending" as const, categoryId: "cat-transport", useCount: 9 },
                            value: { type: "spending" as const, categoryId: "cat-transport" },
                            ruleId: "rule-sbb",
                            destination: null,
                        }],
                    },
                    statementIndex: 0,
                },
            ],
        });
        vi.mocked(api.commitImport).mockResolvedValue({ importId: "i1", counts: { total: 2, imported: 2, excluded: 0, spending: 2, income: 0 } });

        render(<ImportPopin isOpen onClose={vi.fn()} />);

        await pickFile(MT940_CONTENT);
        await continueToReview();

        fireEvent.click(screen.getByRole("radio", { name: "Transport" }));

        fireEvent.click(screen.getByRole("button", { name: "Save rule" }));

        // Nothing to sweep — the only other SBB row is a suggestion, which
        // stays in its section, untouched and unaccepted.
        expect(screen.queryByText(/applied to/)).toBeNull();
        expect(screen.getByText("tap ✓ to confirm")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Confirm suggestion" })).toHaveAttribute("aria-pressed", "false");

        fireEvent.click(screen.getByRole("button", { name: "Confirm import (2)" }));

        await waitFor(() => expect(api.commitImport).toHaveBeenCalledTimes(1));

        const fates = vi.mocked(api.commitImport).mock.calls[0][0].transactions.map((entry) => entry.fate);

        expect(fates[0]).toEqual({ kind: "route", value: { type: "spending", categoryId: "cat-transport" }, learnKey: "SBB" });
        expect(fates[1]).toEqual({ kind: "route", value: { type: "spending", categoryId: "cat-transport" }, ruleId: "rule-sbb" });
    });
});
