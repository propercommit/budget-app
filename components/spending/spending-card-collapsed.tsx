"use client";

import { iconMap } from "@/lib/icon-map";
import { useSettings } from "@/lib/settings-context";
import { budgetStatusColor } from "@/lib/spending/budget-status";
import { spentDisplay } from "@/lib/spending/format-spent";
import { CardActionPill } from "./card-action-pill";

interface SpendingCardCollapsedProps {
    spendingName: string;
    categoryName: string;
    budgetNumber: number;
    totalSpent: number;
    spendingEntries: number;
    spendingItemIcon: string;
    spendingCategoryColor: string;
    onExpand: () => void;
    onEditClick: () => void;
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
    onEditClick,
}: SpendingCardCollapsedProps) {
    const amountLeft = budgetNumber - totalSpent;
    const isOverBudget = amountLeft < 0;
    const spentPercent = budgetNumber > 0 ? Math.round((totalSpent / budgetNumber) * 100) : 0;
    const status = budgetStatusColor(budgetNumber, totalSpent);
    const { formatAmount } = useSettings();
    const spent = spentDisplay(totalSpent, formatAmount);

    return (
        <div className="bg-card border border-(--card-border) rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)]">
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
                            <h2 className="text-base font-semibold truncate" style={{ color: "var(--foreground)" }}>
                                {spendingName}
                            </h2>
                            <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                                {categoryName}
                            </p>
                        </div>
                    </div>

                    {/* Right — Spent/Budget + Chevron */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                            <p className="text-lg font-bold tabular-nums whitespace-nowrap" style={{ color: spent.color }}>
                               {spent.label}
                            </p>
                            <p className="text-xs whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                                of {formatAmount(budgetNumber)}
                            </p>
                        </div>
                        <CardActionPill
                            isExpanded={false}
                            onToggle={onExpand}
                            onEdit={onEditClick}
                        />
                    </div>
                </div>

                {/* Row 2: Progress Bar */}
                <div
                    className="w-full h-3 rounded-full overflow-hidden bg-input"
                >
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
            </div>
        </div>
    );
}