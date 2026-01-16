import { Category } from "@/lib/category";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { SegmentedCircularProgress } from "./segmented-circular-progress";
import { SpendingItem } from "@/lib/types";

interface BudgetOverviewCardProps {
    totalIncome: number;
    categories: Category[];
    spendingItems: SpendingItem[];
}

export function BudgetOverviewCard({ totalIncome, categories, spendingItems }: BudgetOverviewCardProps) {

    const totalBudgeted = spendingItems.reduce((sum, item) => sum + item.budgeted, 0);
    const totalSpent = spendingItems.reduce((sum, item) => sum + item.spent, 0);

    const remainingBudget = totalIncome - totalBudgeted;
    const afterSpending = totalIncome - totalSpent;

    // Group spending by category for the charts
    const budgetedByCategory = categories.map(cat => {
        const total = spendingItems
            .filter(item => item.category?.label === cat.label)
            .reduce((sum, item) => sum + item.budgeted, 0);
        return {
            category: cat.label,
            value: total,
            color: cat.color,
        };
    }).filter(seg => seg.value > 0);

    const spentByCategory = categories.map(cat => {
        const total = spendingItems
            .filter(item => item.category?.label === cat.label)
            .reduce((sum, item) => sum + item.spent, 0);
        return {
            category: cat.label,
            value: total,
            color: cat.color,
        };
    }).filter(seg => seg.value > 0);

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>Budget Overview</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Total Income</span>
                    <span className="text-2xl font-bold">${totalIncome.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-4">
                    <SegmentedCircularProgress segments={budgetedByCategory} label="Total Budgeted" />
                    <SegmentedCircularProgress segments={spentByCategory} label="Total Spent" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className={`p-3 sm:p-4 rounded-lg ${
                        remainingBudget >= 0 ? "bg-green-50" : "bg-red-50"
                    }`}>
                        <span className="text-xs sm:text-sm text-muted-foreground block mb-1 font-medium">
                            Remaining Budget
                        </span>
                        <span className={`text-xl sm:text-2xl font-bold ${
                            remainingBudget >= 0 ? "text-green-700" : "text-red-700"
                        }`}>
                            {remainingBudget >= 0 ? "" : "-"}${Math.abs(remainingBudget).toFixed(2)}
                        </span>
                    </div>
                    <div className={`p-3 sm:p-4 rounded-lg ${
                        afterSpending >= 0 ? "bg-cyan-50" : "bg-red-50"
                    }`}>
                        <span className="text-xs sm:text-sm text-muted-foreground block mb-1 font-medium">
                            After Spending
                        </span>
                        <span className={`text-xl sm:text-2xl font-bold ${
                            afterSpending >= 0 ? "text-cyan-700" : "text-red-700"
                        }`}>
                            {afterSpending >= 0 ? "" : "-"}${Math.abs(afterSpending).toFixed(2)}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}