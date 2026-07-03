import { iconMap } from "@/lib/icon-map";
import { useSettings } from "@/lib/settings-context";
import { CardHeader } from "../ui/card-header";
import { DonutChart } from "../ui/donut-chart";

interface CategoryBreakdown {
    name: string;
    icon?: string;
    color: string;
    spent: number;
    budget: number;
}

interface BudgetOverviewExpandedProps {
    totalIncome: number;
    totalSpent: number;
    totalBudgeted: number;
    categoryBreakdown: CategoryBreakdown[];
    onCollapse: () => void;
}

// ============================================
// PROGRESS BAR COMPONENT
// ============================================
function ProgressBar({ 
    value, 
    max, 
    color = '#007AFF', 
    height = 10 
}: { 
    value: number;
    max: number;
    color?: string;
    height?: number;
}) {
    // Two-sided clamp: a net-credit month can make value negative, and a
    // negative width is invalid CSS (dropped → full-width bar).
    const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
    const isOver = value > max;
    
    return (
        <div 
            className="w-full rounded-full overflow-hidden bg-input"
            style={{ height }}
        >
            <div
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                    width: `${percentage}%`,
                    backgroundColor: isOver ? '#FF3B30' : color
                }}
            />
        </div>
    );
}

// ============================================
// CATEGORY ROW COMPONENT
// ============================================
function CategoryRow({ 
    category, 
    spent, 
    budget, 
    color 
}: { 
    category: { icon?: string; name: string };
    spent: number;
    budget: number;
    color: string;
}) {
    const percentage = budget > 0 ? (spent / budget) * 100 : 0;
    const isOver = spent > budget;
    const { formatAmount } = useSettings();
    
    return (
        <div className="flex items-center gap-3">
            <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                style={{ backgroundColor: `${color}15` }}
            >
                {category.icon ? (iconMap[category.icon] || category.icon) : '📁'}            
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate text-foreground">
                        {category.name}
                    </span>
                    <span className="flex items-center flex-shrink-0 ml-2">
                        {isOver && (
                            <span
                                className="text-xs font-semibold px-1.5 py-0.5 rounded mr-2"
                                style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30' }}
                            >
                                +{formatAmount(spent - budget)}
                            </span>
                        )}
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatAmount(spent)} / {formatAmount(budget)}
                        </span>
                    </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-muted">
                    <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                            // Two-sided clamp — see ProgressBar above.
                            width: `${Math.min(100, Math.max(0, percentage))}%`,
                            backgroundColor: isOver ? '#FF3B30' : color
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

// ============================================
// MAIN EXPANDED COMPONENT
// ============================================
export function BudgetOverviewExpanded({ 
    totalIncome, 
    totalSpent, 
    totalBudgeted, 
    categoryBreakdown, 
    onCollapse 
}: BudgetOverviewExpandedProps) {
    const remaining = totalIncome - totalSpent;
    const isOverspent = totalSpent > totalIncome;
    const incomeUsedPercent = totalIncome > 0 ? (totalSpent / totalIncome) * 100 : 0;
    const budgetUsedPercent = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
    const isOverBudget = totalSpent > totalBudgeted && totalBudgeted > 0;
    const { formatAmount } = useSettings();
    
    // Donut segments from category breakdown. The spent > 0 filter is also the
    // presentation clamp for signed spent: a net-credit (negative) category
    // cannot become a slice — the underlying data stays negative.
    const donutSegments = categoryBreakdown
        .filter(cat => cat.spent > 0)
        .map(cat => ({
            value: cat.spent,
            color: cat.color
        }));

    // The ring normalizes by the positive-slice total, so the legend shares must
    // divide by the same figure — dividing by the signed net totalSpent would
    // print >100% (or 0%) beside a full ring whenever a net-credit category exists.
    const positiveSpentTotal = donutSegments.reduce((sum, segment) => sum + segment.value, 0);

    return (
        <div 
            className="bg-card rounded-3xl overflow-hidden transition-all duration-300 border border-(--card-border) shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
        >
            {/* Header */}
            <div className="px-4 pt-4 sm:px-5 sm:pt-5 cursor-pointer" onClick={onCollapse}>
                <CardHeader isExpanded={true} onToggle={onCollapse} title="Budget Overview" />
            </div>
                
            {/* Expanded Content */}
            <div className="px-4 pb-5 sm:px-5">
                {/* Main Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mt-4 mb-6">
                        <div className="flex-1 p-3 rounded-2xl bg-muted">
                            <p className="text-xs font-medium mb-0.5 text-muted-foreground">Income</p>
                            <p className="text-lg font-bold text-foreground">{formatAmount(totalIncome)}</p>
                        </div>
                        <div 
                            className="flex-1 p-3 rounded-2xl"
                            style={{ backgroundColor: 'rgba(255, 59, 48, 0.06)' }}
                        >
                            <p className="text-xs font-medium mb-0.5 text-muted-foreground">Spent</p>
                            <p className="text-lg font-bold" style={{ color: '#FF3B30' }}>{formatAmount(totalSpent)}</p>
                        </div>
                        <div 
                            className="flex-1 p-3 rounded-2xl"
                            style={{ backgroundColor: isOverspent ? 'rgba(255, 59, 48, 0.06)' : 'rgba(52, 199, 89, 0.06)' }}
                        >
                            <p className="text-xs font-medium mb-0.5 text-muted-foreground">
                                {isOverspent ? 'Over by' : 'Remaining'}
                            </p>
                            <p 
                                className="text-lg font-bold"
                                style={{ color: isOverspent ? '#FF3B30' : '#34C759' }}
                            >
                                {isOverspent ? '-' : ''}{formatAmount(Math.abs(remaining))}
                            </p>
                        </div>
                </div>
                
                {/* Income vs Spent Progress */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">Income Used</span>
                        <span 
                            className="text-sm font-semibold"
                            style={{ color: isOverspent ? '#FF3B30' : '#007AFF' }}
                        >
                            {incomeUsedPercent.toFixed(1)}%
                        </span>
                    </div>
                    <ProgressBar 
                        value={totalSpent} 
                        max={totalIncome} 
                        color="#007AFF"
                        height={10}
                    />
                    <div className="flex justify-between mt-1.5">
                        <span className="text-xs text-muted-foreground/70">{formatAmount(0)}</span>
                        <span className="text-xs text-muted-foreground/70">{formatAmount(totalIncome)}</span>
                    </div>
                </div>
                
                {/* Budget vs Spent Progress (only if budget is set) */}
                {totalBudgeted > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-foreground">Budget Used</span>
                            <span 
                                className="text-sm font-semibold"
                                style={{ color: isOverBudget ? '#FF3B30' : '#34C759' }}
                            >
                                {budgetUsedPercent.toFixed(1)}%
                                {isOverBudget && <span className="ml-1">(Over!)</span>}
                            </span>
                        </div>
                        <ProgressBar 
                            value={totalSpent} 
                            max={totalBudgeted} 
                            color="#34C759"
                            height={10}
                        />
                        <div className="flex justify-between mt-1.5">
                            <span className="text-xs text-muted-foreground/70">$0</span>
                            <span className="text-xs text-muted-foreground/70">Budget: {formatAmount(totalBudgeted)}</span>
                        </div>
                    </div>
                )}
                
                {/* Category Breakdown Section */}
                {categoryBreakdown.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold mb-4 text-foreground">Spending by Category</h3>
                        
                        <div className="flex flex-col sm:flex-row gap-6">
                            {/* Donut Chart */}
                            {donutSegments.length > 0 && (
                                <div className="flex-shrink-0 flex justify-center sm:justify-start">
                                    <DonutChart
                                        segments={donutSegments}
                                        size={120}
                                        strokeWidth={12}
                                        trackColor="var(--muted)"
                                        centerContent={
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-foreground text-center leading-tight">{formatAmount(totalSpent)}</p>
                                                <p className="text-xs text-muted-foreground">Total</p>
                                            </div>
                                        }
                                    />
                                </div>
                            )}
                            
                            {/* Category Legend/List */}
                            <div className="flex-1 space-y-3">
                                {categoryBreakdown.filter(cat => cat.spent > 0).map((cat, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div 
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: cat.color }}
                                        />
                                        <span className="text-sm flex-1 truncate text-foreground">{cat.name}</span>
                                        <span className="text-sm font-medium text-muted-foreground">
                                            {formatAmount(cat.spent)}
                                        </span>
                                        <span className="text-xs text-muted-foreground/70">
                                            {positiveSpentTotal > 0 ? ((cat.spent / positiveSpentTotal) * 100).toFixed(0) : 0}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Category Budget Progress (detailed) */}
                {categoryBreakdown.some(c => c.budget > 0 || c.spent > 0) && (
                    <div className="mt-6 pt-6 border-t border-border">
                        <h3 className="text-sm font-semibold mb-4 text-foreground">Category Budgets</h3>
                        <div className="space-y-4">
                            {categoryBreakdown.filter(c => c.budget > 0 || c.spent > 0).map((cat, i) => (
                                <CategoryRow 
                                    key={i}
                                    category={{ icon: cat.icon, name: cat.name }}
                                    spent={cat.spent}
                                    budget={cat.budget}
                                    color={cat.color}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}