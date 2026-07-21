"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { PopinWrapper } from "@/components/ui/popin-wrapper";
import { Button } from "@/components/ui/button";
import type { Category } from "@/lib/types";
import { commitImport, createCategory, getCategories, previewImport } from "@/lib/api";
import { showErrorToast } from "@/lib/toast";
import { CategoryPopin } from "@/components/category/popins/category-popin";
import { mt940Parser } from "@/lib/import/mt940-parser";
import type { ReconciliationResult } from "@/lib/import/types";
import {
    MAX_IMPORT_TRANSACTIONS,
    assignDestination,
    buildCommitPayload,
    buildReviewRows,
    canConfirm,
    cascadeChipConfirm,
    confirmCount,
    openDecisionCount,
    overallReconciles,
    periodLabel,
    type CommitResult,
    type ReviewRow,
} from "@/lib/import/review";
import { ImportPickStage, type PickedFile } from "@/components/import/import-pick-stage";
import { ImportReviewStage } from "@/components/import/import-review-stage";
import { ImportSuccessStage } from "@/components/import/import-success-stage";

interface ImportPopinProps {
    isOpen: boolean;
    onClose: () => void;
}

type ImportStage = "pick" | "parsing" | "review" | "success";

/**
 * The MT940 import sheet: pick → parsing (staging round-trip) → review →
 * success. All review-row logic is pure (`lib/import/review`); this component
 * owns the stage machine and the two API calls. Callers remount it per open
 * (key pattern), so state needs no self-reset.
 */
export function ImportPopin({ isOpen, onClose }: ImportPopinProps) {

    const [stage, setStage] = useState<ImportStage>("pick");
    const [file, setFile] = useState<PickedFile | null>(null);
    const [pickError, setPickError] = useState<string | null>(null);
    const [reconciliation, setReconciliation] = useState<ReconciliationResult[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [rows, setRows] = useState<ReviewRow[]>([]);
    const [importAnyway, setImportAnyway] = useState(false);
    const [committing, setCommitting] = useState(false);
    const [commitError, setCommitError] = useState<string | null>(null);
    const [result, setResult] = useState<CommitResult | null>(null);

    const reconciles = overallReconciles(reconciliation);
    const open = openDecisionCount(rows);
    const confirmable = canConfirm(rows, reconciles, importAnyway);

    // While the commit is in flight, closing would hide a write that still
    // completes server-side — and the success receipt with it.
    const handleClose = () => {

        if (committing) return;

        onClose();
    };

    const handleContinue = async () => {

        if (file === null) return;

        if (!mt940Parser.canParse(file.content)) {
            setPickError("Unrecognized statement format (expected MT940)");
            return;
        }

        setPickError(null);
        setStage("parsing");

        try {
            const [staged, loadedCategories] = await Promise.all([previewImport(file.content), getCategories()]);

            if (staged.transactions.length === 0) {
                setPickError("No transactions found in this statement.");
                setStage("pick");
                return;
            }

            if (staged.transactions.length > MAX_IMPORT_TRANSACTIONS) {
                setPickError(`This file has ${staged.transactions.length} transactions — the limit is ${MAX_IMPORT_TRANSACTIONS} per import. Split the statement and import it in parts.`);
                setStage("pick");
                return;
            }

            setReconciliation(staged.reconciliation);
            setCategories(loadedCategories as Category[]);
            setRows(buildReviewRows(staged));
            setStage("review");
        } catch (error) {
            setPickError(error instanceof Error ? error.message : "Failed to preview import");
            setStage("pick");
        }
    };

    const handleConfirm = async () => {

        if (!confirmable || committing || file === null) return;

        setCommitting(true);
        setCommitError(null);

        try {
            const committed = await commitImport(buildCommitPayload(rows, file.name, reconciliation));

            setResult(committed);
            setStage("success");
        } catch (error) {
            setCommitError(error instanceof Error ? error.message : "Failed to commit import");
        } finally {
            setCommitting(false);
        }
    };

    // Stable identity so the memoized row components only re-render for the
    // row a tap actually changed.
    const updateRow = useCallback((id: number, transition: (row: ReviewRow) => ReviewRow) => {

        // Frozen during the commit — the success receipt must describe the
        // exact rows that were written.
        if (committing) return;

        setRows((current) => current.map((row) => (row.id === id ? transition(row) : row)));
    }, [committing]);

    // Saving a rule cascades the decision across every matching unknown in
    // the same state update (EL-D18 convergence) — one decision, one rule,
    // one card. All counts and the Confirm gate re-derive from the rows.
    const confirmChip = useCallback((id: number) => {

        if (committing) return;

        setRows((current) => cascadeChipConfirm(current, id));
    }, [committing]);

    // Inline category creation: the stacked CategoryPopin (house pattern —
    // zIndex above the open popin, remount-per-open key), creating through
    // the normal categories route; import never invents taxonomy itself.
    const [creatingCategoryFor, setCreatingCategoryFor] = useState<number | null>(null);
    const [categoryPopinKey, setCategoryPopinKey] = useState(0);

    const requestNewCategory = useCallback((id: number) => {

        // Frozen during the commit, like every other mutation channel.
        if (committing) return;

        setCategoryPopinKey((prev) => prev + 1);
        setCreatingCategoryFor(id);
    }, [committing]);

    const handleCreateCategory = async (data: { name: string; icon: string; color: string }) => {

        const rowId = creatingCategoryFor;

        setCreatingCategoryFor(null);

        if (rowId === null) return;

        try {
            const created: Category = await createCategory({ label: data.name, icon: data.icon, color: data.color });

            // Visible to every row's rail from here on; the initiating row
            // auto-selects it through the ordinary pick channel — but never
            // after the review has been committed (the success receipt must
            // keep describing the exact rows that were written).
            setCategories((current) => [...current, created]);

            if (stage === "review") updateRow(rowId, (row) => assignDestination(row, created.id));
        } catch (error) {
            // Post-close failure — the toast lane; the review stays untouched.
            showErrorToast(error instanceof Error ? error.message : "Couldn't create the category");
        }
    };

    const subtitle =
        stage === "pick"
            ? "Upload an MT940 statement to review"
            : stage === "parsing"
                ? "Hold on — this only takes a moment"
                : [file?.name ?? null, periodLabel(reconciliation), `${rows.length} transactions`].filter((part): part is string => part !== null).join(" · ");

    const reviewHelper =
        commitError !== null
            ? commitError
            : open > 0
                ? `Assign or exclude ${open} more transaction${open === 1 ? "" : "s"} to confirm`
                : reconciles || importAnyway
                    ? null
                    : "Tick “Import anyway” above to confirm despite the mismatch";

    const footer =
        stage === "parsing" ? undefined : (
            <div>
                {stage === "review" && reviewHelper !== null && (
                    <p
                        className={`text-center text-xs m-0 mb-2.5 ${commitError === null ? "text-muted-foreground" : "font-medium"}`}
                        style={commitError === null ? undefined : { color: "#FF3B30" }}
                        role={commitError === null ? undefined : "alert"}
                    >
                        {reviewHelper}
                    </p>
                )}

                {stage === "success" ? (
                    <Button className="w-full" onClick={onClose}>
                        Done
                    </Button>
                ) : (
                    <div className="flex gap-3">
                        <Button variant="secondary" className="flex-1" disabled={committing} onClick={handleClose}>
                            Cancel
                        </Button>

                        {stage === "pick" ? (
                            <Button className="flex-1" disabled={file === null} onClick={() => void handleContinue()}>
                                Continue
                            </Button>
                        ) : (
                            <Button className="flex-1" disabled={!confirmable || committing} onClick={() => void handleConfirm()}>
                                Confirm import ({confirmCount(rows)})
                            </Button>
                        )}
                    </div>
                )}
            </div>
        );

    return (
        <>
            <PopinWrapper
                isOpen={isOpen}
                onClose={handleClose}
                title={stage === "pick" || stage === "parsing" ? "Import bank statement" : "Review import"}
                subtitle={subtitle}
                footer={footer}
            >
                {stage === "pick" && (
                    <ImportPickStage
                        file={file}
                        error={pickError}
                        onPick={(picked) => {
                            setFile(picked);
                            setPickError(null);
                        }}
                        onRemove={() => {
                            setFile(null);
                            setPickError(null);
                        }}
                    />
                )}

                {stage === "parsing" && (
                    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 animate-in fade-in duration-200">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" strokeWidth={2} />
                        <p className="text-[15px] font-semibold text-foreground m-0 mt-2">Reading {file?.name}…</p>
                        <p className="text-[13px] text-muted-foreground m-0 text-center">Parsing MT940 · matching your rules · reconciling balances</p>
                    </div>
                )}

                {stage === "review" && (
                    <ImportReviewStage
                        rows={rows}
                        categories={categories}
                        reconciliation={reconciliation}
                        importAnyway={importAnyway}
                        onImportAnywayChange={setImportAnyway}
                        onUpdate={updateRow}
                        onConfirmChip={confirmChip}
                        onRequestNewCategory={requestNewCategory}
                    />
                )}

                {stage === "success" && result !== null && (
                    <ImportSuccessStage rows={rows} result={result} categories={categories} />
                )}
            </PopinWrapper>

            {/* Stacked above the review sheet — house pattern: zIndex one level
                up, remount-per-open key so the form starts fresh every time. */}
            <CategoryPopin
                key={`import-category-${categoryPopinKey}`}
                isOpen={creatingCategoryFor !== null}
                onClose={() => setCreatingCategoryFor(null)}
                onSave={(data) => void handleCreateCategory(data)}
                mode="create"
                zIndex={60}
            />
        </>
    );
}
