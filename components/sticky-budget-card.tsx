interface StickyBudgetCardProps {
    remainingBudget: number;
    totalIncome: number;
    isVisible: boolean;
}

export function StickyBudgetCard({
    remainingBudget,
    totalIncome,
    isVisible,
}: StickyBudgetCardProps) {
    if (!isVisible) return null;

    const isPositive = remainingBudget >= 0;
    const isSlightlyOver = !isPositive && Math.abs(remainingBudget / totalIncome) < 0.1;

    const bgClass = isPositive
        ? "bg-green-50 border-green-200"
        : isSlightlyOver
            ? "bg-orange-50 border-orange-200"
            : "bg-red-50 border-red-200";

    const textClass = isPositive
        ? "text-green-700"
        : isSlightlyOver
            ? "text-orange-700"
            : "text-red-700";

    return (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-3 sm:p-4 bg-background/95 backdrop-blur-sm border-t shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="container mx-auto max-w-7xl">
                <div className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors duration-200 ${bgClass}`}>
                    <span className="text-sm sm:text-base font-medium text-muted-foreground">
                        Remaining Budget
                    </span>
                    <span className={`text-lg sm:text-xl font-bold ${textClass}`}>
                        {isPositive ? "" : "-"}${Math.abs(remainingBudget).toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    );
}