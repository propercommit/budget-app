import { useState } from "react";
import { Category } from "@/lib/category";
import { SpendingItem } from "@/lib/types";
import { BudgetOverviewCollapsed } from "./budget-overview-collapsed";
import { BudgetOverviewExpanded } from "./budget-overview-expanded";

interface BudgetOverviewProps {
    totalIncome: number;
    categories: Category[];
    spendingItems: SpendingItem[];
    /** First-run: dashed placeholder tiles + caption instead of the zero figures. */
    isEmpty?: boolean;
}

export function BudgetOverviewCard({ totalIncome, categories, spendingItems, isEmpty = false }: BudgetOverviewProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Calculate totals
    const totalBudgeted = spendingItems.reduce((sum, item) => sum + item.budgeted, 0);
    const totalSpent = spendingItems.reduce((sum, item) => sum + item.spent, 0);

    // Build category breakdown
    const categoryBreakdown = categories.map(cat => {
        const categoryItems = spendingItems.filter(item => item.category?.label === cat.label);
        const spent = categoryItems.reduce((sum, item) => sum + item.spent, 0);
        const budget = categoryItems.reduce((sum, item) => sum + item.budgeted, 0);
        return {
            name: cat.label,
            icon: cat.icon,
            color: cat.color,
            spent,
            budget
        };
    });

    if (isExpanded) {
        return (
            <BudgetOverviewExpanded
                totalIncome={totalIncome}
                totalSpent={totalSpent}
                totalBudgeted={totalBudgeted}
                categoryBreakdown={categoryBreakdown}
                onCollapse={() => setIsExpanded(false)}
            />
        );
    }

    return (
        <BudgetOverviewCollapsed
            totalIncome={totalIncome}
            totalSpent={totalSpent}
            onExpand={() => setIsExpanded(true)}
            isEmpty={isEmpty}
        />
    );
}