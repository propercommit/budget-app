"use client";

import { PopinWrapper } from "@/components/ui/popin-wrapper";
import { Button } from "@/components/ui/button";
import { iconMap } from "@/lib/icon-map";
import { useSettings } from "@/lib/settings-context";
import { spentDisplay } from "@/lib/spending/format-spent";

interface SpendingItemDetailPopinProps {
    isOpen: boolean;
    onClose: () => void;
    onEdit: () => void;
    spendingName: string;
    spendingItemIcon: string;
    categoryName: string;
    spendingCategoryColor: string;
    budgetNumber: number;
    totalSpent: number;
    entriesCount: number;
    note?: string;
}

export function SpendingItemDetailPopin({
    isOpen,
    onClose,
    onEdit,
    spendingName,
    spendingItemIcon,
    categoryName,
    spendingCategoryColor,
    budgetNumber,
    totalSpent,
    entriesCount,
    note,
}: SpendingItemDetailPopinProps) {
    const { formatAmount } = useSettings();
    const spent = spentDisplay(totalSpent, formatAmount);

    const remaining = budgetNumber - totalSpent;
    const isOverBudget = remaining < 0;
    const spentPercent = budgetNumber > 0 ? Math.round((totalSpent / budgetNumber) * 100) : 0;

    return (
        <PopinWrapper
            isOpen={isOpen}
            onClose={onClose}
            title="Spending Details"
            headerActions={
                <button
                    onClick={onEdit}
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95"
                    style={{ backgroundColor: "var(--muted)" }}
                >
                    <svg className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </button>
            }
            footer={
                <Button variant="secondary" className="w-full h-12" onClick={onClose}>
                    Close
                </Button>
            }
        >
            <div className="space-y-5">
                <div className="flex items-center gap-4">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                        style={{ backgroundColor: `${spendingCategoryColor}15` }}
                    >
                        {iconMap[spendingItemIcon] || spendingItemIcon}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>
                            {spendingName}
                        </h3>
                        <div
                            className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold text-white mt-1"
                            style={{ backgroundColor: spendingCategoryColor }}
                        >
                            {categoryName}
                        </div>
                    </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                <div className="p-4 rounded-2xl" style={{ backgroundColor: "var(--muted)" }}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>Monthly Budget</span>
                        <span className="text-lg font-bold" style={{ color: "var(--foreground)" }}>{formatAmount(budgetNumber)}</span>
                    </div>

                    <div className="w-full h-3 rounded-full overflow-hidden bg-input">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                // Two-sided clamp: negative spent (net-credit month) must render 0%, not invalid CSS.
                                width: `${Math.min(100, Math.max(0, spentPercent))}%`,
                                backgroundColor: isOverBudget ? "#FF3B30" : spentPercent > 80 ? "#FF9500" : "#34C759",
                            }}
                        />
                    </div>

                    <div className="flex items-center justify-between mt-3">
                        <div>
                            <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>Spent: </span>
                            <span className="text-sm font-semibold" style={{ color: spent.color }}>{spent.label}</span>
                        </div>
                        <div
                            className="px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{
                                backgroundColor: isOverBudget ? "rgba(255, 59, 48, 0.1)" : "rgba(52, 199, 89, 0.1)",
                                color: isOverBudget ? "#FF3B30" : "#34C759",
                            }}
                        >
                            {isOverBudget
                                ? `${formatAmount(Math.abs(remaining))} over`
                                : `${formatAmount(remaining)} left`
                            }
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>Entries</span>
                        <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                            {entriesCount} {entriesCount === 1 ? "entry" : "entries"}
                        </span>
                    </div>
                </div>

                {note && (
                    <div>
                        <p className="text-sm font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>Note</p>
                        <p className="text-sm p-4 rounded-xl leading-relaxed" style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}>
                            {note}
                        </p>
                    </div>
                )}
            </div>
        </PopinWrapper>
    );
}