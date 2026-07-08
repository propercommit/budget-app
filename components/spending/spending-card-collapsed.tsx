"use client";

import { SpendingCardHeader } from "./spending-card-header";
import { ExpandToggleBar } from "./expand-toggle-bar";

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
    return (
        <div data-spending-card className="bg-card border border-(--card-border) rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="p-3.5 pb-[9px] sm:p-5 sm:pb-3.5">
                <SpendingCardHeader
                    spendingName={spendingName}
                    categoryName={categoryName}
                    budgetNumber={budgetNumber}
                    totalSpent={totalSpent}
                    spendingEntries={spendingEntries}
                    spendingItemIcon={spendingItemIcon}
                    spendingCategoryColor={spendingCategoryColor}
                    onEditClick={onEditClick}
                />

                <ExpandToggleBar isExpanded={false} onToggle={onExpand} />
            </div>
        </div>
    );
}
