"use client";

import { useState } from "react";
import { AlertTriangle, Check, ChevronDown } from "lucide-react";
import { FormBanner } from "@/components/ui/form-banner";
import type { Category } from "@/lib/types";
import type { ReconciliationResult } from "@/lib/import/types";
import {
    firstFailing,
    openDecisionCount,
    overallReconciles,
    reconcileWarnText,
    sectionsOf,
    type ReviewRow,
} from "@/lib/import/review";
import { DecisionRow, ExcludedRow, MatchedRow, SuggestedRow, type RowUpdate } from "@/components/import/review-rows";

interface ImportReviewStageProps {
    rows: ReviewRow[];
    categories: Category[];
    reconciliation: ReconciliationResult[];
    importAnyway: boolean;
    onImportAnywayChange: (value: boolean) => void;
    onUpdate: RowUpdate;
}

function SectionHeader({
    dotColor,
    label,
    badge,
    badgeStyle,
    trailing,
}: {
    dotColor: string;
    label: string;
    badge: string;
    badgeStyle: React.CSSProperties;
    trailing?: React.ReactNode;
}) {

    return (
        <div className="flex items-center gap-2 mt-0.5 mb-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
            <span className="text-[15px] font-semibold text-foreground">{label}</span>
            <span className="h-5 px-2 rounded-full text-xs font-semibold inline-flex items-center" style={badgeStyle}>
                {badge}
            </span>
            <span className="flex-1" />
            {trailing}
        </div>
    );
}

function CollapseChevron({ open }: { open: boolean }) {

    return (
        <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <ChevronDown
                className="size-4 text-muted-foreground transition-transform duration-200"
                style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
                strokeWidth={2.4}
            />
        </span>
    );
}

/**
 * The review body: progress header, reconciliation banners, and the four row
 * sections. Collapsible-section state lives here; every row mutation flows up
 * through `onUpdate` as a pure transition.
 */
export function ImportReviewStage({
    rows,
    categories,
    reconciliation,
    importAnyway,
    onImportAnywayChange,
    onUpdate,
}: ImportReviewStageProps) {

    const sections = sectionsOf(rows);
    const open = openDecisionCount(rows);
    const resolved = rows.length - open;
    const excludedCount = sections.excluded.length;
    const reconciles = overallReconciles(reconciliation);
    const failing = firstFailing(reconciliation);
    const allMatched = rows.length > 0 && rows.every((row) => row.tier === "matched");

    const [matchedOpen, setMatchedOpen] = useState(false);
    const [excludedOpen, setExcludedOpen] = useState(false);

    // Excluding a row must never look like data loss: the pile pops open the
    // moment it grows so the row is visibly still there (render-phase state
    // adjustment — the sanctioned alternative to a setState-in-effect).
    const [prevExcludedCount, setPrevExcludedCount] = useState(excludedCount);

    if (excludedCount !== prevExcludedCount) {
        setPrevExcludedCount(excludedCount);

        if (excludedCount > prevExcludedCount) setExcludedOpen(true);
    }

    return (
        <div>
            <div className="sticky -top-5 z-10 bg-card -mx-5 -mt-5 px-5 pt-4 pb-3 border-b border-border mb-3.5">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-[13px] font-semibold text-foreground tabular-nums m-0">
                        {resolved} of {rows.length} resolved
                        {excludedCount > 0 ? ` · ${excludedCount} excluded` : ""}
                    </p>

                    {reconciles ? (
                        <span className="flex items-center gap-1 text-xs font-semibold flex-shrink-0" style={{ color: "#1F7A38" }}>
                            Statement reconciles
                            <span className="flex items-center justify-center w-[13px] h-[13px] rounded-full" style={{ backgroundColor: "#34C759" }}>
                                <Check className="size-2.5 text-white" strokeWidth={3} />
                            </span>
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold flex-shrink-0" style={{ color: "#A05A00" }}>
                            <AlertTriangle className="size-3.5" style={{ color: "#FF9500" }} strokeWidth={2.4} />
                            Doesn’t reconcile
                        </span>
                    )}
                </div>

                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                            width: `${rows.length === 0 ? 0 : Math.round((resolved / rows.length) * 100)}%`,
                            backgroundColor: open === 0 ? "#34C759" : "var(--primary)",
                        }}
                    />
                </div>
            </div>

            {allMatched && (
                <div className="mb-3.5">
                    <FormBanner variant="success">
                        All {rows.length} transactions matched automatically — glance through and confirm.
                    </FormBanner>
                </div>
            )}

            {failing !== null && (
                <div className="mb-3.5">
                    <FormBanner variant="warning">
                        {reconcileWarnText(failing)}

                        <button
                            type="button"
                            role="checkbox"
                            aria-checked={importAnyway}
                            onClick={() => onImportAnywayChange(!importAnyway)}
                            className="flex items-center gap-2.5 mt-1.5 min-h-11 bg-transparent border-none px-0 cursor-pointer"
                        >
                            <span
                                className="w-5 h-5 rounded-md flex items-center justify-center transition-all duration-150 flex-shrink-0"
                                style={
                                    importAnyway
                                        ? { backgroundColor: "#FF9500", border: "1.5px solid #FF9500" }
                                        : { backgroundColor: "var(--card)", border: "1.5px solid rgba(160, 90, 0, 0.4)" }
                                }
                            >
                                {importAnyway && <Check className="size-3.5 text-white" strokeWidth={3} />}
                            </span>
                            <span className="text-[13px] font-semibold" style={{ color: "var(--banner-warning-text)" }}>
                                Import anyway — I’ll sort it out manually
                            </span>
                        </button>
                    </FormBanner>
                </div>
            )}

            {sections.decisions.length > 0 && (
                <section>
                    <SectionHeader
                        dotColor="#FF9500"
                        label="Needs your decision"
                        badge={open === 0 ? "All done ✓" : `${open} left`}
                        badgeStyle={
                            open === 0
                                ? { backgroundColor: "rgba(52, 199, 89, 0.12)", color: "#1F7A38" }
                                : { backgroundColor: "rgba(255, 149, 0, 0.12)", color: "#C77700" }
                        }
                    />

                    {sections.decisions.map((row) => (
                        <DecisionRow key={row.id} row={row} categories={categories} onUpdate={onUpdate} />
                    ))}
                </section>
            )}

            {sections.suggested.length > 0 && (
                <section className="mt-4">
                    <SectionHeader
                        dotColor="#FFCC00"
                        label="Suggested"
                        badge={String(sections.suggested.length)}
                        badgeStyle={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
                        trailing={<span className="text-xs text-muted-foreground/80">tap ✓ to confirm</span>}
                    />

                    {sections.suggested.map((row) => (
                        <SuggestedRow key={row.id} row={row} categories={categories} onUpdate={onUpdate} />
                    ))}
                </section>
            )}

            {sections.matched.length > 0 && (
                <section className="mt-4">
                    <button
                        type="button"
                        onClick={() => setMatchedOpen(!matchedOpen)}
                        className="w-full min-h-11 bg-transparent border-none px-0 cursor-pointer"
                        aria-expanded={matchedOpen}
                    >
                        <SectionHeader
                            dotColor="#34C759"
                            label="Matched"
                            badge={String(sections.matched.length)}
                            badgeStyle={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
                            trailing={<CollapseChevron open={matchedOpen} />}
                        />
                    </button>

                    {matchedOpen &&
                        sections.matched.map((row) => (
                            <MatchedRow key={row.id} row={row} categories={categories} onUpdate={onUpdate} />
                        ))}
                </section>
            )}

            {sections.excluded.length > 0 && (
                <section className="mt-4">
                    <button
                        type="button"
                        onClick={() => setExcludedOpen(!excludedOpen)}
                        className="w-full min-h-11 bg-transparent border-none px-0 cursor-pointer"
                        aria-expanded={excludedOpen}
                    >
                        <SectionHeader
                            dotColor="#8E8E93"
                            label="Excluded"
                            badge={String(sections.excluded.length)}
                            badgeStyle={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
                            trailing={<CollapseChevron open={excludedOpen} />}
                        />
                    </button>

                    {excludedOpen && (
                        <>
                            <p className="text-xs text-muted-foreground/80 m-0 mb-1">
                                These won’t be imported. Nothing disappears silently — re-include anything below.
                            </p>

                            {sections.excluded.map((row) => (
                                <ExcludedRow key={row.id} row={row} onUpdate={onUpdate} />
                            ))}
                        </>
                    )}
                </section>
            )}
        </div>
    );
}
