"use client";

import { useState } from "react";
import { PopinWrapper } from "@/components/ui/popin-wrapper";
import { Button } from "@/components/ui/button";
import type { Category } from "@/lib/types";
import { commitImport, getCategories, previewImport } from "@/lib/api";
import { mt940Parser } from "@/lib/import/mt940-parser";
import {
    buildCommitPayload,
    buildReviewRows,
    canConfirm,
    confirmCount,
    openDecisionCount,
    overallReconciles,
    periodLabel,
    type CommitResult,
    type PreviewResponse,
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
    const [preview, setPreview] = useState<PreviewResponse | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [rows, setRows] = useState<ReviewRow[]>([]);
    const [importAnyway, setImportAnyway] = useState(false);
    const [committing, setCommitting] = useState(false);
    const [commitError, setCommitError] = useState<string | null>(null);
    const [result, setResult] = useState<CommitResult | null>(null);

    const reconciliation = preview !== null ? preview.reconciliation : [];
    const reconciles = overallReconciles(reconciliation);
    const open = openDecisionCount(rows);
    const confirmable = canConfirm(rows, reconciles, importAnyway);

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

            setPreview(staged);
            setCategories(loadedCategories as Category[]);
            setRows(buildReviewRows(staged));
            setStage("review");
        } catch (error) {
            setPickError(error instanceof Error ? error.message : "Failed to preview import");
            setStage("pick");
        }
    };

    const handleConfirm = async () => {

        if (!confirmable || committing || file === null || preview === null) return;

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

    const updateRow = (id: number, transition: (row: ReviewRow) => ReviewRow) => {
        setRows((current) => current.map((row) => (row.id === id ? transition(row) : row)));
    };

    const subtitleParts =
        stage === "pick"
            ? ["Upload an MT940 statement to review"]
            : stage === "parsing"
                ? ["Hold on — this only takes a moment"]
                : [file?.name ?? null, periodLabel(reconciliation), `${rows.length} transactions`].filter((part): part is string => part !== null);

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
                        <Button variant="secondary" className="flex-1" onClick={onClose}>
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
        <PopinWrapper
            isOpen={isOpen}
            onClose={onClose}
            title={stage === "pick" || stage === "parsing" ? "Import bank statement" : "Review import"}
            subtitle={subtitleParts.join(" · ")}
            footer={footer}
        >
            {stage === "pick" && (
                <ImportPickStage file={file} error={pickError} onPick={setFile} onRemove={() => setFile(null)} />
            )}

            {stage === "parsing" && (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 animate-in fade-in duration-200">
                    <div className="w-10 h-10 rounded-full border-[3px] border-muted animate-spin" style={{ borderTopColor: "var(--primary)" }} />
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
                />
            )}

            {stage === "success" && result !== null && (
                <ImportSuccessStage rows={rows} result={result} categories={categories} />
            )}
        </PopinWrapper>
    );
}
