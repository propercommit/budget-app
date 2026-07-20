"use client";

import { Ban, Check, ChevronDown } from "lucide-react";
import type { Category } from "@/lib/types";
import { iconMap } from "@/lib/icon-map";
import {
    amountLabel,
    assignDestination,
    chipConfirm,
    chipDismiss,
    chipReopen,
    chipSelectToken,
    excludeRow,
    reincludeRow,
    shortDate,
    suggestionReason,
    toggleAccepted,
    toggleExpanded,
    undoExclude,
    type ReviewRow,
} from "@/lib/import/review";
import { destinationInfo } from "@/components/import/destination";
import { CategoryPillRail } from "@/components/import/category-pill-rail";
import { RuleChipCard } from "@/components/import/rule-chip";

/** Applies one pure row transition — the single mutation channel of the review. */
export type RowUpdate = (id: number, transition: (row: ReviewRow) => ReviewRow) => void;

interface RowProps {
    row: ReviewRow;
    categories: Category[];
    onUpdate: RowUpdate;
}

const CREDIT_COLOR = "#34C759";

const DEBIT_COLOR = "#FF3B30";

function rowAmountColor(row: ReviewRow): string | undefined {

    if (row.tier === "excluded") return undefined;

    return row.tx.direction === "credit" ? CREDIT_COLOR : DEBIT_COLOR;
}

function ruleChipFor(row: ReviewRow, categories: Category[], onUpdate: RowUpdate) {

    if (row.chip === null) return null;

    return (
        <RuleChipCard
            chip={row.chip}
            destination={row.chip.kind === "exclude" || row.dest === null ? null : destinationInfo(row.dest, categories)}
            onSelectToken={(index) => onUpdate(row.id, (current) => chipSelectToken(current, index))}
            onConfirm={() => onUpdate(row.id, chipConfirm)}
            onDismiss={() => onUpdate(row.id, chipDismiss)}
            onReopen={() => onUpdate(row.id, chipReopen)}
        />
    );
}

/**
 * A "Needs your decision" row: open (pill rail), resolved (check + chip +
 * Change), or tombstoned (excluded in place with Undo) — plus the learning
 * chip once decided. Rows never leave this pile; they collapse in place.
 */
export function DecisionRow({ row, categories, onUpdate }: RowProps) {

    const showPills = row.tier === "unknown" || (row.tier === "assigned" && row.expanded);
    const resolved = row.tier === "assigned" ? destinationInfo(row.dest ?? "", categories) : null;

    return (
        <div className="py-3 border-b border-muted last:border-b-0">
            <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-foreground truncate m-0">{row.tx.description}</p>
                    <p className="text-xs text-muted-foreground m-0 mt-0.5">{shortDate(row.tx.date)}</p>
                </div>
                <span
                    className={`text-[15px] font-bold tabular-nums flex-shrink-0 ${row.tier === "excluded" ? "text-muted-foreground" : ""}`}
                    style={{ color: rowAmountColor(row) }}
                >
                    {amountLabel(row.tx)}
                </span>
            </div>

            {showPills && (
                <CategoryPillRail
                    categories={categories}
                    direction={row.tx.direction}
                    selectedDest={row.dest}
                    showExcludeActions
                    onPick={(dest) => onUpdate(row.id, (current) => assignDestination(current, dest))}
                    onLeaveOut={() => onUpdate(row.id, (current) => excludeRow(current, "once"))}
                    onAlwaysExclude={() => onUpdate(row.id, (current) => excludeRow(current, "always"))}
                />
            )}

            {row.tier === "assigned" && !row.expanded && resolved !== null && (
                <div className="flex items-center gap-2 mt-2">
                    <span className="flex items-center justify-center w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: CREDIT_COLOR }}>
                        <Check className="size-3 text-white" strokeWidth={3} />
                    </span>

                    <span
                        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[13px] font-semibold"
                        style={{ backgroundColor: `${resolved.color}22`, color: resolved.color }}
                    >
                        <span className="flex [&_svg]:size-3.5">{iconMap[resolved.icon] ?? resolved.icon}</span>
                        {resolved.label}
                    </span>

                    <span className="flex-1" />

                    <button
                        type="button"
                        onClick={() => onUpdate(row.id, toggleExpanded)}
                        className="h-11 sm:h-7 px-3 rounded-full bg-muted text-xs font-semibold text-muted-foreground transition-all active:scale-95"
                    >
                        Change
                    </button>
                </div>
            )}

            {row.tier === "excluded" && (
                <div className="flex items-center gap-2 mt-2">
                    <Ban className="size-4 flex-shrink-0" style={{ color: "#8E8E93" }} strokeWidth={2} />

                    <span className="text-xs font-medium text-muted-foreground flex-1 min-w-0">
                        {row.excludeKind === "always" ? "Excluded — moved to the Excluded pile below." : "Left out — this one won’t be imported."}
                    </span>

                    <button
                        type="button"
                        onClick={() => onUpdate(row.id, undoExclude)}
                        className="text-[13px] font-semibold text-primary bg-transparent border-none px-2 py-1 min-h-11 sm:min-h-[26px]"
                    >
                        Undo
                    </button>
                </div>
            )}

            {ruleChipFor(row, categories, onUpdate)}
        </div>
    );
}

/** A "Suggested" row: evidence line, destination chip, advisory accept check. */
export function SuggestedRow({ row, categories, onUpdate }: RowProps) {

    const destination = destinationInfo(row.dest ?? "", categories);
    const reason = suggestionReason(row, (id) => destinationInfo(id, categories).label);

    return (
        <div className="py-3 border-b border-muted last:border-b-0">
            <div className="flex items-center gap-3">
                <span
                    className="flex items-center justify-center w-9 h-9 rounded-[11px] flex-shrink-0 [&_svg]:size-4"
                    style={{ backgroundColor: `${destination.color}29`, color: destination.color }}
                >
                    {iconMap[destination.icon] ?? destination.icon}
                </span>

                <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-foreground truncate m-0">{row.tx.description}</p>
                    <p className="text-xs text-muted-foreground m-0 mt-0.5 truncate">
                        {shortDate(row.tx.date)}
                        {reason !== null ? ` · ${reason}` : ""}
                    </p>

                    <button
                        type="button"
                        onClick={() => onUpdate(row.id, toggleExpanded)}
                        className="inline-flex items-center gap-1.5 h-11 sm:h-[30px] px-2.5 rounded-full text-[13px] font-semibold mt-1.5 transition-all active:scale-95"
                        style={
                            row.accepted
                                ? { backgroundColor: destination.color, color: "#FFFFFF" }
                                : { backgroundColor: `${destination.color}22`, color: destination.color }
                        }
                    >
                        <span className="flex [&_svg]:size-3.5">{iconMap[destination.icon] ?? destination.icon}</span>
                        {destination.label}
                        <ChevronDown className="size-3" strokeWidth={2.4} />
                    </button>
                </div>

                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="text-[15px] font-bold tabular-nums" style={{ color: rowAmountColor(row) }}>
                        {amountLabel(row.tx)}
                    </span>

                    <button
                        type="button"
                        aria-label="Confirm suggestion"
                        onClick={() => onUpdate(row.id, toggleAccepted)}
                        className="w-11 h-11 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
                        style={
                            row.accepted
                                ? { backgroundColor: CREDIT_COLOR, color: "#FFFFFF" }
                                : { backgroundColor: "rgba(52, 199, 89, 0.08)", color: CREDIT_COLOR, border: "1.5px solid rgba(52, 199, 89, 0.4)" }
                        }
                    >
                        <Check className="size-[18px]" strokeWidth={2.6} />
                    </button>
                </div>
            </div>

            {row.expanded && (
                <CategoryPillRail
                    categories={categories}
                    direction={row.tx.direction}
                    selectedDest={row.dest}
                    showExcludeActions={false}
                    onPick={(dest) => onUpdate(row.id, (current) => assignDestination(current, dest))}
                />
            )}
        </div>
    );
}

/** A compact "Matched" row; tapping it opens the recategorize rail. */
export function MatchedRow({ row, categories, onUpdate }: RowProps) {

    const destination = destinationInfo(row.dest ?? "", categories);

    return (
        <div className="border-b border-muted last:border-b-0">
            <button
                type="button"
                onClick={() => onUpdate(row.id, toggleExpanded)}
                className="flex items-center gap-2.5 w-full py-2.5 text-left"
            >
                <span
                    className="flex items-center justify-center w-7 h-7 rounded-[9px] flex-shrink-0 [&_svg]:size-3.5"
                    style={{ backgroundColor: `${destination.color}29`, color: destination.color }}
                >
                    {iconMap[destination.icon] ?? destination.icon}
                </span>

                <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-foreground truncate">{row.tx.description}</span>
                    <span className="block text-[11px] text-muted-foreground">{shortDate(row.tx.date)}</span>
                </span>

                <span
                    className="h-[22px] px-2 rounded-full text-[11px] font-semibold inline-flex items-center flex-shrink-0"
                    style={{ backgroundColor: `${destination.color}1F`, color: destination.color }}
                >
                    {destination.label}
                </span>

                <span
                    className="text-[13px] font-semibold tabular-nums flex-shrink-0"
                    style={row.tx.direction === "credit" ? { color: CREDIT_COLOR } : undefined}
                >
                    {amountLabel(row.tx)}
                </span>
            </button>

            {row.expanded && (
                <div className="pb-2.5">
                    <CategoryPillRail
                        categories={categories}
                        direction={row.tx.direction}
                        selectedDest={row.dest}
                        showExcludeActions={false}
                        onPick={(dest) => onUpdate(row.id, (current) => assignDestination(current, dest))}
                    />
                </div>
            )}
        </div>
    );
}

/** An "Excluded" pile row with its provenance line and the Re-include escape. */
export function ExcludedRow({ row, onUpdate }: Omit<RowProps, "categories">) {

    return (
        <div className="flex items-center gap-2.5 py-2.5 border-b border-muted last:border-b-0">
            <Ban className="size-4 flex-shrink-0" style={{ color: "#8E8E93" }} strokeWidth={2} />

            <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-muted-foreground truncate">{row.tx.description}</span>
                <span className="block text-[11px] text-muted-foreground/80">
                    {shortDate(row.tx.date)} · {row.excludeKind === "always" ? "Rule: always skipped" : "Left out this import only"}
                </span>
            </span>

            <span className="text-[13px] font-medium tabular-nums text-muted-foreground flex-shrink-0">{amountLabel(row.tx)}</span>

            <button
                type="button"
                onClick={() => onUpdate(row.id, reincludeRow)}
                className="h-11 sm:h-7 px-3 rounded-full bg-muted text-xs font-semibold text-primary flex-shrink-0 transition-all active:scale-95"
            >
                Re-include
            </button>
        </div>
    );
}
