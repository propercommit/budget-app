"use client";

import { useState } from "react";
import { SpendingCardCollapsed } from "./spending-card-collapsed";
import { SpendingCardExpanded, SpendingEntry } from "./spending-card-expanded";

interface SpendingCardProps {
    spendingName: string;
    spendingItemIcon: string;
    categoryName: string;
    spendingCategoryColor: string;
    budgetNumber: number;
    entries: SpendingEntry[];
    onItemDetailClick: () => void;
    onEntryClick: (entry: SpendingEntry) => void;
    onAddEntry: () => void;
}

export function SpendingCard({
    spendingName,
    spendingItemIcon,
    categoryName,
    spendingCategoryColor,
    budgetNumber,
    entries,
    onItemDetailClick,
    onEntryClick,
    onAddEntry,
}: SpendingCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const totalSpent = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const spendingEntries = entries.length;

    if (isExpanded) {
        return (
            <SpendingCardExpanded
                spendingName={spendingName}
                categoryName={categoryName}
                budgetNumber={budgetNumber}
                totalSpent={totalSpent}
                spendingEntries={spendingEntries}
                spendingItemIcon={spendingItemIcon}
                spendingCategoryColor={spendingCategoryColor}
                entries={entries}
                onCollapse={() => setIsExpanded(false)}
                onEntryClick={onEntryClick}
                onAddEntry={onAddEntry}
                onItemDetailClick={onItemDetailClick}
            />
        );
    }

    return (
        <SpendingCardCollapsed
            spendingName={spendingName}
            categoryName={categoryName}
            budgetNumber={budgetNumber}
            totalSpent={totalSpent}
            spendingEntries={spendingEntries}
            spendingItemIcon={spendingItemIcon}
            spendingCategoryColor={spendingCategoryColor}
            onExpand={() => setIsExpanded(true)}
        />
    );
}