"use client";

import { Check, Sparkles } from "lucide-react";
import type { Category } from "@/lib/types";
import { learnedRules, type CommitResult, type ReviewRow } from "@/lib/import/review";
import { destinationInfo } from "@/components/import/destination";

interface ImportSuccessStageProps {
    rows: ReviewRow[];
    result: CommitResult;
    categories: Category[];
}

const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "June 2026" (or "May – June 2026") from the imported rows' entry dates. */
function importedMonthsLabel(rows: ReviewRow[]): string | null {

    const months = [...new Set(rows.filter((row) => row.tier !== "excluded").map((row) => row.tx.date.slice(0, 7)))].sort();

    if (months.length === 0) return null;

    const label = (month: string) => `${FULL_MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
    const first = months[0];
    const last = months[months.length - 1];

    if (first === last) return label(first);

    if (first.slice(0, 4) === last.slice(0, 4)) return `${FULL_MONTHS[Number(first.slice(5, 7)) - 1]} – ${label(last)}`;

    return `${label(first)} – ${label(last)}`;
}

/**
 * The post-commit summary: the pop-in check disc, server-confirmed counts,
 * and the learned-rules receipt.
 */
export function ImportSuccessStage({ rows, result, categories }: ImportSuccessStageProps) {

    const rules = learnedRules(rows);
    const monthsLabel = importedMonthsLabel(rows);
    const categoryCount = new Set(rows.filter((row) => row.tier !== "excluded" && row.dest !== null).map((row) => row.dest)).size;

    const subtitle = [monthsLabel, `${categoryCount} ${categoryCount === 1 ? "category" : "categories"}`, `${result.counts.excluded} excluded`]
        .filter((part) => part !== null)
        .join(" · ");

    return (
        <div className="flex flex-col items-center text-center px-1 pt-7 pb-3 animate-in fade-in duration-300">
            <span
                className="w-16 h-16 rounded-full flex items-center justify-center animate-in zoom-in duration-500"
                style={{ backgroundColor: "#34C759", boxShadow: "0 8px 24px rgba(52, 199, 89, 0.35)" }}
            >
                <Check className="size-8 text-white" strokeWidth={2.6} />
            </span>

            <h3 className="text-xl font-bold text-foreground whitespace-nowrap m-0 mt-4">
                {result.counts.imported} entries imported
            </h3>

            <p className="text-[13px] text-muted-foreground m-0 mt-1">{subtitle}</p>

            {rules.length > 0 && (
                <div className="w-full bg-muted rounded-2xl p-3.5 mt-5 text-left">
                    <p className="text-[13px] font-semibold text-foreground m-0 mb-1">
                        {rules.length} rule{rules.length === 1 ? "" : "s"} learned
                    </p>

                    {rules.map((rule, index) => {
                        const destination = rule.dest === null ? null : destinationInfo(rule.dest, categories);

                        return (
                            <div key={index} className="flex items-center gap-2 py-1">
                                <Sparkles className="size-3.5 text-primary flex-shrink-0" strokeWidth={2} />
                                <span className="text-[13px] font-semibold text-foreground">{rule.token}</span>
                                <span className="text-[13px] text-muted-foreground">→</span>
                                <span
                                    className="h-[22px] px-2 rounded-full text-[11px] font-semibold inline-flex items-center"
                                    style={
                                        destination === null
                                            ? { backgroundColor: "var(--border)", color: "var(--muted-foreground)" }
                                            : { backgroundColor: `${destination.color}22`, color: destination.color }
                                    }
                                >
                                    {destination === null ? "Always skipped" : destination.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
