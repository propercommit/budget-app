"use client";

import { iconMap } from "@/lib/icon-map";
import { useSettings } from "@/lib/settings-context";
import { budgetStatusColor } from "@/lib/spending/budget-status";
import { spentDisplay } from "@/lib/spending/format-spent";
import { EditItemButton } from "./edit-item-button";

interface SpendingCardHeaderProps {
    spendingName: string;
    categoryName: string;
    budgetNumber: number;
    totalSpent: number;
    spendingEntries: number;
    spendingItemIcon: string;
    spendingCategoryColor: string;
    onEditClick: () => void;
    /** When provided, the icon + name cluster becomes a button opening the item detail popin (expanded card). */
    onItemDetailClick?: () => void;
}

/**
 * Header shared verbatim by the collapsed and expanded cards: icon + name,
 * spent/budget with the edit button, progress bar and status row. Owns the
 * status math so the two states cannot drift apart. A long name or category
 * ellipsizes (min-w-0 + truncate) — it must never push the actions out of
 * the card at carousel width.
 */
export function SpendingCardHeader({
    spendingName,
    categoryName,
    budgetNumber,
    totalSpent,
    spendingEntries,
    spendingItemIcon,
    spendingCategoryColor,
    onEditClick,
    onItemDetailClick,
}: SpendingCardHeaderProps) {

    const amountLeft = budgetNumber - totalSpent;
    const isOverBudget = amountLeft < 0;
    const spentPercent = budgetNumber > 0 ? Math.round((totalSpent / budgetNumber) * 100) : 0;
    const status = budgetStatusColor(budgetNumber, totalSpent);
    const { formatAmount } = useSettings();
    const spent = spentDisplay(totalSpent, formatAmount);

    const identity = (
        <>
            <div
                className="w-[34px] h-[34px] rounded-[10px] sm:w-11 sm:h-11 sm:rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: `${spendingCategoryColor}15` }}
            >
                {iconMap[spendingItemIcon] || spendingItemIcon}
            </div>
            <div className="min-w-0 text-left">
                <h2 className="text-[15px] leading-[19px] sm:text-base sm:leading-[22px] font-semibold truncate" style={{ color: "var(--foreground)" }}>
                    {spendingName}
                </h2>
                <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                    {categoryName}
                </p>
            </div>
        </>
    );

    return (
        <>
            {/* Row 1: Header */}
            <div className="flex items-center justify-between mb-3">
                {onItemDetailClick !== undefined ? (
                    <button
                        className="flex items-center gap-[9px] sm:gap-3 min-w-0 transition-all duration-200 active:scale-[0.98]"
                        onClick={onItemDetailClick}
                    >
                        {identity}
                    </button>
                ) : (
                    <div className="flex items-center gap-[9px] sm:gap-3 min-w-0">
                        {identity}
                    </div>
                )}

                {/* Right — Spent/Budget + Edit */}
                <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                    <div className="text-right">
                        <p className="text-base sm:text-lg font-bold tabular-nums whitespace-nowrap" style={{ color: spent.color }}>
                            {spent.label}
                        </p>
                        <p className="text-[11px] sm:text-xs whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                            of {formatAmount(budgetNumber)}
                        </p>
                    </div>
                    <EditItemButton onEdit={onEditClick} />
                </div>
            </div>

            {/* Row 2: Progress Bar */}
            <div className="w-full h-3 rounded-full overflow-hidden bg-input">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                        // Two-sided clamp: a net-credit month has negative spent, and a
                        // negative width is invalid CSS (dropped → full-width bar).
                        width: `${Math.min(100, Math.max(0, spentPercent))}%`,
                        backgroundColor: status.color,
                    }}
                />
            </div>

            {/* Row 3: Status */}
            <div className="flex items-center justify-between mt-3">
                {/* Remaining pill */}
                <div
                    className="px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: status.tint, color: status.color }}
                >
                    {isOverBudget
                        ? `${formatAmount(Math.abs(amountLeft))} over`
                        : `${formatAmount(amountLeft)} left`}
                </div>

                {/* Entries count */}
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {spendingEntries} {spendingEntries === 1 ? "entry" : "entries"}
                </span>
            </div>
        </>
    );
}
