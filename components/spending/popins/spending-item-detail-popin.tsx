"use client";

import { PopinWrapper } from "@/components/ui/popin-wrapper";
import { useSettings } from "@/lib/settings-context";

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
    startDate: string;
    endDate?: string;
    note?: string;
}

const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

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
    startDate,
    endDate,
    note,
}: SpendingItemDetailPopinProps) {
    const { formatAmount } = useSettings();

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
                    style={{ backgroundColor: "#F5F5F7" }}
                >
                    <svg className="w-5 h-5" style={{ color: "#6E6E73" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </button>
            }
            footer={
                <button
                    onClick={onClose}
                    className="w-full py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]"
                    style={{ backgroundColor: "#F5F5F7", color: "#1D1D1F" }}
                >
                    Close
                </button>
            }
        >
            <div className="space-y-5">
                <div className="flex items-center gap-4">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                        style={{ backgroundColor: `${spendingCategoryColor}15` }}
                    >
                        {spendingItemIcon}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-semibold" style={{ color: "#1D1D1F" }}>
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

                <div className="h-px" style={{ background: "linear-gradient(to right, transparent, #E5E5EA, transparent)" }} />

                <div className="p-4 rounded-2xl" style={{ backgroundColor: "#F5F5F7" }}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium" style={{ color: "#6E6E73" }}>Monthly Budget</span>
                        <span className="text-lg font-bold" style={{ color: "#1D1D1F" }}>{formatAmount(budgetNumber)}</span>
                    </div>

                    <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: "#E5E5EA" }}>
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${Math.min(spentPercent, 100)}%`,
                                backgroundColor: isOverBudget ? "#FF3B30" : spentPercent > 80 ? "#FF9500" : "#34C759",
                            }}
                        />
                    </div>

                    <div className="flex items-center justify-between mt-3">
                        <div>
                            <span className="text-sm" style={{ color: "#6E6E73" }}>Spent: </span>
                            <span className="text-sm font-semibold" style={{ color: "#1D1D1F" }}>{formatAmount(totalSpent)}</span>
                        </div>
                        <div
                            className="px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{
                                backgroundColor: isOverBudget ? "rgba(255, 59, 48, 0.1)" : "rgba(52, 199, 89, 0.1)",
                                color: isOverBudget ? "#FF3B30" : "#34C759",
                            }}
                        >
                            {isOverBudget
                                ? `$${Math.abs(remaining).toLocaleString()} over`
                                : `$${remaining.toLocaleString()} left`}
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium" style={{ color: "#6E6E73" }}>Duration</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold" style={{ color: "#1D1D1F" }}>{formatDate(startDate)}</span>
                            <svg className="w-4 h-4" style={{ color: "#C7C7CC" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                            <span className="text-sm font-semibold" style={{ color: endDate ? "#1D1D1F" : "#34C759" }}>
                                {endDate ? formatDate(endDate) : "Present"}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium" style={{ color: "#6E6E73" }}>Entries</span>
                        <span className="text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                            {entriesCount} {entriesCount === 1 ? "entry" : "entries"}
                        </span>
                    </div>
                </div>

                {note && (
                    <div>
                        <p className="text-sm font-medium mb-2" style={{ color: "#6E6E73" }}>Note</p>
                        <p className="text-sm p-4 rounded-xl leading-relaxed" style={{ backgroundColor: "#F5F5F7", color: "#1D1D1F" }}>
                            {note}
                        </p>
                    </div>
                )}
            </div>
        </PopinWrapper>
    );
}