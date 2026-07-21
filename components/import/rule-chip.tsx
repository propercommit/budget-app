"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { chipCardName, type RuleChip } from "@/lib/import/review";
import type { DestinationInfo } from "@/components/import/destination";

interface RuleChipCardProps {
    chip: RuleChip;
    /** Where the rule would route — null for skip rules (exclude kind). */
    destination: DestinationInfo | null;
    onSelectToken: (index: number) => void;
    onConfirm: () => void;
    onDismiss: () => void;
    onReopen: () => void;
    /** Commits a custom card name; empty input falls back to the token. */
    onSetSeriesName: (name: string) => void;
}

const CHIP_SHELL: Record<RuleChip["status"], { className: string; style?: React.CSSProperties }> = {
    open: { className: "bg-primary/5 border-primary/20" },
    confirmed: { className: "", style: { backgroundColor: "rgba(52, 199, 89, 0.08)", borderColor: "rgba(52, 199, 89, 0.25)" } },
    dismissed: { className: "bg-muted border-border" },
};

/**
 * The rule-learning question under a decided row: "Auto-categorize TOKEN →
 * Category next time?" (or "Always skip TOKEN in future imports?") with a
 * token picker and save/dismiss buttons; settles into a one-line receipt with
 * an Undo.
 */
export function RuleChipCard({ chip, destination, onSelectToken, onConfirm, onDismiss, onReopen, onSetSeriesName }: RuleChipCardProps) {

    const token = chip.tokens[chip.selected] ?? "";
    const shell = CHIP_SHELL[chip.status];

    // null = not editing; the draft commits on Enter/blur, Escape discards.
    const [nameDraft, setNameDraft] = useState<string | null>(null);

    const commitDraft = () => {

        if (nameDraft === null) return;

        onSetSeriesName(nameDraft);
        setNameDraft(null);
    };

    return (
        <div
            className={`mt-2.5 rounded-[14px] border px-3.5 py-3 animate-in fade-in slide-in-from-top-1 duration-300 ${shell.className}`}
            style={shell.style}
        >
            {chip.status === "open" ? (
                <>
                    <p className="text-[13px] leading-snug text-foreground m-0">
                        {chip.kind === "exclude" ? (
                            <>Always skip <b>{token}</b> in future imports?</>
                        ) : (
                            <>Auto-categorize <b>{token}</b> → <b style={{ color: destination?.color }}>{destination?.label}</b> next time?</>
                        )}
                    </p>

                    {chip.kind === "assign" && destination !== null && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-[13px] text-muted-foreground">
                            {nameDraft !== null ? (
                                <input
                                    autoFocus
                                    aria-label="Card name"
                                    value={nameDraft}
                                    maxLength={100}
                                    onChange={(event) => setNameDraft(event.target.value)}
                                    onBlur={commitDraft}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") commitDraft();

                                        if (event.key === "Escape") setNameDraft(null);
                                    }}
                                    className="flex-1 min-w-0 h-11 sm:h-8 px-2.5 rounded-xl border border-border bg-card text-[13px] text-foreground outline-none focus:border-primary"
                                />
                            ) : (
                                <>
                                    <span className="min-w-0 truncate">
                                        will appear as <b className="text-foreground">{chipCardName(chip)}</b> in{" "}
                                        <b style={{ color: destination.color }}>{destination.label}</b>
                                    </span>

                                    <button
                                        type="button"
                                        aria-label="Rename card"
                                        onClick={() => setNameDraft(chipCardName(chip))}
                                        className="w-11 h-11 sm:w-7 sm:h-7 rounded-full flex items-center justify-center flex-shrink-0 text-muted-foreground transition-all active:scale-[0.92] hover:bg-muted"
                                    >
                                        <Pencil className="size-3.5" strokeWidth={2} />
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        {chip.tokens.map((candidate, index) => (
                            <button
                                key={candidate}
                                type="button"
                                onClick={() => onSelectToken(index)}
                                className={`h-11 sm:h-[30px] px-3 rounded-full text-[13px] font-semibold transition-all duration-150 border ${
                                    index === chip.selected
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-card text-muted-foreground border-border"
                                }`}
                            >
                                {candidate}
                            </button>
                        ))}

                        <span className="flex-1" />

                        <button
                            type="button"
                            aria-label="Save rule"
                            onClick={onConfirm}
                            className="w-11 h-11 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[var(--shadow-btn-primary)] transition-all active:scale-[0.92]"
                        >
                            <Check className="size-4" strokeWidth={2.6} />
                        </button>

                        <button
                            type="button"
                            aria-label="Dismiss"
                            onClick={onDismiss}
                            className="w-11 h-11 sm:w-8 sm:h-8 rounded-full bg-card text-muted-foreground border border-border flex items-center justify-center transition-all active:scale-[0.92]"
                        >
                            <X className="size-3.5" strokeWidth={2.4} />
                        </button>
                    </div>
                </>
            ) : (
                <div className="flex items-center gap-2">
                    {chip.status === "confirmed" ? (
                        <span className="flex items-center justify-center w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: "#34C759" }}>
                            <Check className="size-3 text-white" strokeWidth={3} />
                        </span>
                    ) : (
                        <X className="size-4 text-muted-foreground flex-shrink-0" strokeWidth={2.4} />
                    )}

                    <span className={`text-[13px] font-medium flex-1 min-w-0 ${chip.status === "confirmed" && chip.cascaded !== undefined && chip.cascaded > 0 ? "break-words" : "truncate"} ${chip.status === "confirmed" ? "" : "text-muted-foreground"}`} style={chip.status === "confirmed" ? { color: "#1F7A38" } : undefined}>
                        {chip.status === "dismissed"
                            ? "No rule learned for this one"
                            : chip.kind === "exclude"
                                ? `Will always skip ${token}`
                                : `Will auto-categorize ${token} → ${destination?.label ?? ""}${chip.seriesName === undefined ? "" : ` as “${chip.seriesName}”`}`}
                        {chip.status === "confirmed" && chip.cascaded !== undefined && chip.cascaded > 0 && (
                            <span className="text-muted-foreground"> · applied to {chip.cascaded} more transaction{chip.cascaded === 1 ? "" : "s"}</span>
                        )}
                    </span>

                    <button
                        type="button"
                        onClick={onReopen}
                        className="text-[13px] font-semibold text-primary bg-transparent border-none px-2 py-1 min-h-11 sm:min-h-[26px] cursor-pointer"
                    >
                        Undo
                    </button>
                </div>
            )}
        </div>
    );
}
