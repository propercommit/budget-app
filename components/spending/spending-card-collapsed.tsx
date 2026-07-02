"use client";

import { iconMap } from "@/lib/icon-map";
import { useSettings } from "@/lib/settings-context";
import { ExpandToggleButton } from "../ui/expand-toggle-button";

interface SpendingCardCollapsedProps {
    spendingName: string;
    categoryName: string;
    budgetNumber: number;
    totalSpent: number;
    spendingEntries: number;
    spendingItemIcon: string;
    spendingCategoryColor: string;
    onExpand: () => void;
}

export function SpendingCardCollapsed({
    spendingName,
    categoryName,
    budgetNumber,
    totalSpent,
    spendingEntries,
    spendingItemIcon,
    spendingCategoryColor,
    onExpand,
}: SpendingCardCollapsedProps) {
    const amountLeft = budgetNumber - totalSpent;
    const isOverBudget = amountLeft < 0;
    const spentPercent = budgetNumber > 0 ? Math.round((totalSpent / budgetNumber) * 100) : 0;
    const { formatAmount } = useSettings();

    return (
        <div
            className="rounded-2xl overflow-hidden"
            style={{
                backgroundColor: "#ffffffff",
                border: "1px solid rgba(0, 0, 0, 0.06)",
            }}
        >
            <div className="p-4 sm:p-5">
                {/* Row 1: Header */}
                <div className="flex items-center justify-between mb-3">
                    {/* Left — Icon + Name/Category */}
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                            style={{ backgroundColor: `${spendingCategoryColor}15` }}
                        >
                            {iconMap[spendingItemIcon] || spendingItemIcon}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base font-semibold truncate" style={{ color: "#1D1D1F" }}>
                                {spendingName}
                            </h2>
                            <p className="text-xs truncate" style={{ color: "#6E6E73" }}>
                                {categoryName}
                            </p>
                        </div>
                    </div>

                    {/* Right — Spent/Budget + Chevron */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                            <p className="text-lg font-bold tabular-nums whitespace-nowrap" style={{ color: "#1D1D1F" }}>
                               {formatAmount(totalSpent)}
                            </p>
                            <p className="text-xs whitespace-nowrap" style={{ color: "#6E6E73" }}>
                                of {formatAmount(budgetNumber)}
                            </p>
                        </div>
                        <ExpandToggleButton
                            isExpanded={false}
                            onToggle={onExpand}
                        />
                    </div>
                </div>

                {/* Row 2: Progress Bar */}
                <div
                    className="w-full h-3 rounded-full overflow-hidden"
                    style={{ backgroundColor: "#E5E5EA" }}
                >
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            // Two-sided clamp: a net-credit month has negative spent, and a
                            // negative width is invalid CSS (dropped → full-width bar).
                            width: `${Math.min(100, Math.max(0, spentPercent))}%`,
                            backgroundColor: isOverBudget
                                ? "#FF3B30"
                                : spentPercent > 80
                                    ? "#FF9500"
                                    : "#34C759",
                        }}
                    />
                </div>

                {/* Row 3: Status */}
                <div className="flex items-center justify-between mt-3">
                    {/* Remaining pill */}
                    <div
                        className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{
                            backgroundColor: isOverBudget
                                ? "rgba(255, 59, 48, 0.1)"
                                : "rgba(52, 199, 89, 0.1)",
                            color: isOverBudget ? "#FF3B30" : "#34C759",
                        }}
                    >
                        {isOverBudget
                            ? `${formatAmount(Math.abs(amountLeft))} over`
                            : `${formatAmount(amountLeft)} left`}
                    </div>

                    {/* Entries count */}
                    <span className="text-xs" style={{ color: "#6E6E73" }}>
                        {spendingEntries} {spendingEntries === 1 ? "entry" : "entries"}
                    </span>
                </div>
            </div>
        </div>
    );
}