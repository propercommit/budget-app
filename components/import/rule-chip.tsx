"use client";

import { Check, X } from "lucide-react";
import type { RuleChip } from "@/lib/import/review";
import type { DestinationInfo } from "@/components/import/destination";

interface RuleChipCardProps {
    chip: RuleChip;
    /** Where the rule would route — null for skip rules (exclude kind). */
    destination: DestinationInfo | null;
    onSelectToken: (index: number) => void;
    onConfirm: () => void;
    onDismiss: () => void;
    onReopen: () => void;
}

const chipShell = (status: RuleChip["status"]): { className: string; style?: React.CSSProperties } => {

    if (status === "open") return { className: "bg-primary/5 border-primary/20" };

    if (status === "confirmed") return { className: "", style: { backgroundColor: "rgba(52, 199, 89, 0.08)", borderColor: "rgba(52, 199, 89, 0.25)" } };

    return { className: "bg-muted border-border" };
};

/**
 * The rule-learning question under a decided row: "Auto-categorize TOKEN →
 * Category next time?" (or "Always skip TOKEN in future imports?") with a
 * token picker and save/dismiss buttons; settles into a one-line receipt with
 * an Undo.
 */
export function RuleChipCard({ chip, destination, onSelectToken, onConfirm, onDismiss, onReopen }: RuleChipCardProps) {

    const token = chip.tokens[chip.selected] ?? "";
    const shell = chipShell(chip.status);

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

                    <span className={`text-[13px] font-medium flex-1 min-w-0 truncate ${chip.status === "confirmed" ? "" : "text-muted-foreground"}`} style={chip.status === "confirmed" ? { color: "#1F7A38" } : undefined}>
                        {chip.status === "dismissed"
                            ? "No rule learned for this one"
                            : chip.kind === "exclude"
                                ? `Will always skip ${token}`
                                : `Will auto-categorize ${token} → ${destination?.label ?? ""}`}
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
