import { useState } from "react";
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

/**
 * Share of budget used, as displayed by the row's progress bar; a zero budget
 * reads as 0%. The Category Budgets sort uses the same formula so the order
 * always agrees with the bars.
 */
const usagePercentage = (spent: number, budget: number): number => budget > 0 ? (spent / budget) * 100 : 0;

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
    const percentage = usagePercentage(spent, budget);
    const isOver = spent > budget;
    const { formatAmount } = useSettings();

    return (
        <div className="flex items-center gap-3">
            <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                style={{ backgroundColor: `${color}1A`, color }}
            >
                {category.icon !== undefined ? (iconMap[category.icon] ?? category.icon) : '📁'}
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
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-input">
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
// DONUT LEGEND ROW COMPONENT
// ============================================
function LegendRow({
    category,
    isDimmed,
    onHoverStart,
    onHoverEnd
}: {
    category: CategoryBreakdown;
    isDimmed: boolean;
    onHoverStart: () => void;
    onHoverEnd: () => void;
}) {
    const { formatAmount } = useSettings();

    return (
        <div
            className="flex items-center gap-2 cursor-pointer transition-opacity duration-200"
            style={{ opacity: isDimmed ? 0.4 : 1 }}
            onMouseEnter={onHoverStart}
            onMouseLeave={onHoverEnd}
        >
            <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${category.color}1A`, color: category.color }}
            >
                {category.icon !== undefined ? (iconMap[category.icon] ?? category.icon) : '📁'}
            </div>
            <span className="text-sm text-foreground whitespace-nowrap">{category.name}</span>
            {/* Dotted leader tying the label to its right-aligned amount. */}
            <span
                aria-hidden
                className="flex-1 self-center h-[5px]"
                style={{
                    backgroundImage: 'radial-gradient(circle, color-mix(in oklab, var(--muted-foreground) 45%, transparent) 1.1px, transparent 1.5px)',
                    backgroundSize: '7px 5px',
                    backgroundRepeat: 'repeat-x',
                    backgroundPosition: 'center left'
                }}
            />
            <span className="w-[72px] text-right text-sm font-semibold text-foreground tabular-nums">
                {formatAmount(category.spent)}
            </span>
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

    // Hovering a donut slice or its legend row highlights that category (the
    // others dim) and reveals its share beside the ring. Keyed by name — the
    // breakdown is one entry per category label.
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

    // Donut slices and legend rows share this list — sorted by spent, largest
    // first, so the clockwise slice order matches the legend's top-down order.
    // The spent > 0 filter is also the presentation clamp for signed spent: a
    // net-credit (negative) category cannot become a slice — the underlying
    // data stays negative. filter() copies, so sort() never mutates the prop.
    const spendingByCategory = categoryBreakdown
        .filter(cat => cat.spent > 0)
        .sort((a, b) => b.spent - a.spent);

    // The ring normalizes by the positive-slice total, so the hover share must
    // divide by the same figure — dividing by the signed net totalSpent would
    // print >100% (or 0%) beside a full ring whenever a net-credit category exists.
    const positiveSpentTotal = spendingByCategory.reduce((sum, cat) => sum + cat.spent, 0);

    const isDimmed = (name: string): boolean => hoveredCategory !== null && hoveredCategory !== name;

    const donutSegments = spendingByCategory.map(cat => ({
        value: cat.spent,
        color: cat.color,
        style: { opacity: isDimmed(cat.name) ? 0.4 : 1, transition: 'opacity 0.2s ease', cursor: 'pointer' },
        onMouseEnter: () => setHoveredCategory(cat.name),
        onMouseLeave: () => setHoveredCategory(null),
    }));

    const hoveredCat = spendingByCategory.find(cat => cat.name === hoveredCategory);
    const hoveredShare = hoveredCat !== undefined && positiveSpentTotal > 0 ? `${((hoveredCat.spent / positiveSpentTotal) * 100).toFixed(0)}%` : '';

    // The share readout sits in the empty space left of the ring; labelClassName
    // carries the per-size offsets (the mobile ring is smaller than the desktop one).
    const renderDonut = (size: number, labelClassName: string) => (
        <div className="relative shrink-0">
            <div className={`absolute text-right pointer-events-none ${labelClassName}`}>
                <span
                    className="font-bold tracking-tight"
                    style={{ color: hoveredCat !== undefined ? hoveredCat.color : undefined }}
                >
                    {hoveredShare}
                </span>
            </div>
            <DonutChart
                segments={donutSegments}
                size={size}
                strokeWidth={Math.round(size * 0.1)}
                trackColor="var(--muted)"
            />
        </div>
    );

    return (
        <div
            className="bg-card rounded-3xl overflow-hidden transition-all duration-300 border border-(--card-border) shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
        >
            {/* Header */}
            <div className="px-4 pt-4 sm:px-5 sm:pt-5 cursor-pointer" onClick={onCollapse}>
                <CardHeader isExpanded={true} onToggle={onCollapse} title="Budget Overview" />
            </div>

            {/* Expanded Content */}
            <div className="flex flex-col gap-4 px-4 pt-3 pb-4 sm:px-5 sm:pt-4 sm:pb-5">
                {/* Spending by Category */}
                {categoryBreakdown.length > 0 && (
                    <div className="p-4 rounded-2xl bg-muted">
                        <h3 className="text-sm font-semibold mb-4 text-foreground">Spending by Category</h3>

                        <div className="flex flex-col items-center gap-5 sm:flex-row-reverse sm:justify-between sm:gap-6">
                            {/* Donut Chart — desktop sits right of the legend with room
                                for the share readout on its left; mobile stacks on top. */}
                            {spendingByCategory.length > 0 && (
                                <>
                                    <div className="hidden sm:block sm:ml-[86px] sm:mr-8">
                                        {renderDonut(184, '-top-1.5 -left-[86px] w-[76px] text-[28px]')}
                                    </div>
                                    <div className="sm:hidden">
                                        {renderDonut(150, '-top-0.5 -left-[58px] w-[52px] text-2xl')}
                                    </div>
                                </>
                            )}

                            {/* Category Legend/List */}
                            <div className="flex w-full flex-col gap-3 sm:flex-1">
                                {spendingByCategory.map(cat => (
                                    <LegendRow
                                        key={cat.name}
                                        category={cat}
                                        isDimmed={isDimmed(cat.name)}
                                        onHoverStart={() => setHoveredCategory(cat.name)}
                                        onHoverEnd={() => setHoveredCategory(null)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Category Budget Progress (detailed) */}
                {categoryBreakdown.some(c => c.budget > 0 || c.spent > 0) && (
                    <div className="p-4 rounded-2xl bg-muted">
                        <h3 className="text-sm font-semibold mb-4 text-foreground">Category Budgets</h3>
                        <div className="space-y-4">
                            {categoryBreakdown
                                .filter(c => c.budget > 0 || c.spent > 0)
                                .sort((a, b) => usagePercentage(b.spent, b.budget) - usagePercentage(a.spent, a.budget))
                                .map((cat) => (
                                    <CategoryRow
                                        key={cat.name}
                                        category={{ icon: cat.icon, name: cat.name }}
                                        spent={cat.spent}
                                        budget={cat.budget}
                                        color={cat.color}
                                    />
                                ))}
                        </div>
                    </div>
                )}

                {/* Income vs Spent Progress */}
                <div className="p-3 rounded-2xl bg-muted">
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
                        <span className="text-xs font-semibold" style={{ color: isOverspent ? '#FF3B30' : '#007AFF' }}>{formatAmount(totalSpent)}</span>
                        <span className="text-xs text-muted-foreground/70">{formatAmount(totalIncome)}</span>
                    </div>
                </div>

                {/* Budget vs Spent Progress (only if budget is set) */}
                {totalBudgeted > 0 && (
                    <div className="p-3 rounded-2xl bg-muted">
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
                            <span className="text-xs font-semibold" style={{ color: isOverBudget ? '#FF3B30' : '#34C759' }}>{formatAmount(totalSpent)}</span>
                            <span className="text-xs text-muted-foreground/70">Budget: {formatAmount(totalBudgeted)}</span>
                        </div>
                    </div>
                )}

                {/* Main Stats Grid */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <div className="p-2.5 sm:p-3 rounded-[14px] sm:rounded-2xl bg-muted">
                            <p className="text-[11px] sm:text-xs font-medium mb-0.5 text-muted-foreground">Income</p>
                            <p className="text-[15px] sm:text-lg font-bold text-foreground whitespace-nowrap">{formatAmount(totalIncome)}</p>
                        </div>
                        <div
                            className="p-2.5 sm:p-3 rounded-[14px] sm:rounded-2xl"
                            style={{ backgroundColor: 'rgba(255, 59, 48, 0.06)' }}
                        >
                            <p className="text-[11px] sm:text-xs font-medium mb-0.5 text-muted-foreground">Spent</p>
                            <p className="text-[15px] sm:text-lg font-bold whitespace-nowrap" style={{ color: '#FF3B30' }}>{formatAmount(totalSpent)}</p>
                        </div>
                        <div
                            className="p-2.5 sm:p-3 rounded-[14px] sm:rounded-2xl"
                            style={{ backgroundColor: isOverspent ? 'rgba(255, 59, 48, 0.06)' : 'rgba(52, 199, 89, 0.06)' }}
                        >
                            <p className="text-[11px] sm:text-xs font-medium mb-0.5 text-muted-foreground">
                                {isOverspent ? 'Over by' : (
                                    <>
                                        <span className="sm:hidden">Left</span>
                                        <span className="hidden sm:inline">Remaining</span>
                                    </>
                                )}
                            </p>
                            <p
                                className="text-[15px] sm:text-lg font-bold whitespace-nowrap"
                                style={{ color: isOverspent ? '#FF3B30' : '#34C759' }}
                            >
                                {isOverspent ? '-' : ''}{formatAmount(Math.abs(remaining))}
                            </p>
                        </div>
                </div>
            </div>
        </div>
    );
}
