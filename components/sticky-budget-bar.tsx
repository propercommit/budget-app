"use client"

import { useEffect, useState } from "react";
import { useSettings } from "@/lib/settings-context";

interface StickyBudgetBarProps {
    totalIncome: number;
    totalBudgeted: number;
    totalSpent: number;
}

export function StickyBudgetBar({ totalIncome, totalBudgeted, totalSpent }: StickyBudgetBarProps) {
    const { formatAmount } = useSettings();
    const [isVisible, setIsVisible] = useState(false);
    const remainingBudget = totalIncome - totalBudgeted;
    const afterSpending = totalIncome - totalSpent;

    useEffect(() => {
        const handleScroll = () => {
            const spendingSection = document.querySelector("[data-spending-section]");
            const budgetOverview = document.querySelector("[data-budget-overview]");

            if (spendingSection && budgetOverview) {
                const spendingRect = spendingSection.getBoundingClientRect();
                const budgetRect = budgetOverview.getBoundingClientRect();

                const isSpendingInView = spendingRect.top < window.innerHeight && spendingRect.bottom > 0;
                const isBudgetOverviewVisible = budgetRect.top < window.innerHeight;

                setIsVisible(isSpendingInView && !isBudgetOverviewVisible);
            }
        };

        window.addEventListener("scroll", handleScroll);
        handleScroll();

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 left-0 right-0 z-30 px-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-3">
                {/* Remaining Budget */}
                <div
                    className={`flex-1 flex items-center justify-between px-4 py-3 rounded-lg shadow-lg ${
                        remainingBudget >= 0
                            ? "bg-green-100"
                            : "bg-red-100"
                    }`}
                >
                    <span className={`text-sm sm:text-base font-medium ${
                        remainingBudget >= 0 ? "text-green-700" : "text-red-700"
                    }`}>
                        Remaining Budget
                    </span>
                    <span
                        className={`text-lg sm:text-xl font-bold ${
                            remainingBudget >= 0 ? "text-green-700" : "text-red-700"
                        }`}
                    >
                        {formatAmount(remainingBudget)}
                    </span>
                </div>

                {/* After Spending */}
                <div
                    className={`flex-1 flex items-center justify-between px-4 py-3 rounded-lg shadow-lg ${
                        afterSpending >= 0
                            ? "bg-cyan-100"
                            : "bg-red-100"
                    }`}
                >
                    <span className={`text-sm sm:text-base font-medium ${
                        afterSpending >= 0 ? "text-cyan-700" : "text-red-700"
                    }`}>
                        After Spending
                    </span>
                    <span
                        className={`text-lg sm:text-xl font-bold ${
                            afterSpending >= 0 ? "text-cyan-700" : "text-red-700"
                        }`}
                    >
                        {formatAmount(afterSpending)}
                    </span>
                </div>
            </div>
        </div>
    );
}