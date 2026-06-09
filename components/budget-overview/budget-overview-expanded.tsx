import { iconMap } from "@/lib/icon-map";
import { useSettings } from "@/lib/settings-context";
import { CardHeader } from "../ui/card-header";

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
// DONUT CHART COMPONENT
// ============================================
function DonutChart({ 
    segments, 
    size = 120, 
    strokeWidth = 12, 
    centerContent 
}: { 
    segments: { value: number; color: string }[];
    size?: number;
    strokeWidth?: number;
    centerContent?: React.ReactNode;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;
    
    const total = segments.reduce((sum, s) => sum + s.value, 0);
    
    // Pre-calculate offsets for each segment
    const segmentsWithOffsets = segments.reduce<{ segment: typeof segments[0]; offset: number; length: number }[]>(
        (acc, segment) => {
            const percentage = total > 0 ? segment.value / total : 0;
            const segmentLength = percentage * circumference;
            const previousOffset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].length : 0;
            
            acc.push({
                segment,
                offset: previousOffset,
                length: segmentLength
            });
            
            return acc;
        },
        []
    );
    
    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size}>
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="#F5F5F7"
                    strokeWidth={strokeWidth}
                />
                {segmentsWithOffsets.map(({ segment, offset, length }, i) => (
                    <circle
                        key={i}
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke={segment.color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${length} ${circumference - length}`}
                        strokeDashoffset={-offset}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${center} ${center})`}
                        style={{ transition: 'stroke-dasharray 0.5s ease' }}
                    />
                ))}
            </svg>
            {centerContent && (
                <div className="absolute inset-0 flex items-center justify-center">
                    {centerContent}
                </div>
            )}
        </div>
    );
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
    const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    const isOver = value > max;
    
    return (
        <div 
            className="w-full rounded-full overflow-hidden bg-gray-200"
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
                    <span className="text-sm font-medium truncate text-gray-900">
                        {category.name}
                    </span>
                    <span className="text-sm text-gray-500 flex-shrink-0 ml-2 whitespace-nowrap">
                        {formatAmount(spent)} / {formatAmount(budget)}
                    </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-gray-100">
                    <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ 
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: isOver ? '#FF3B30' : color
                        }}
                    />
                </div>
            </div>
            {isOver && (
                <span 
                    className="text-xs font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30' }}
                >
                    +{formatAmount(spent - budget)}
                </span>
            )}
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
    
    // Donut segments from category breakdown
    const donutSegments = categoryBreakdown
        .filter(cat => cat.spent > 0)
        .map(cat => ({
            value: cat.spent,
            color: cat.color
        }));

    return (
        <div 
            className="bg-white rounded-3xl overflow-hidden transition-all duration-300"
            style={{ boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)', border: '1px solid rgba(0, 0, 0, 0.04)' }}
        >
            {/* Header */}
            <div className="px-4 pt-4 sm:px-5 sm:pt-5 cursor-pointer" onClick={onCollapse}>
                <CardHeader isExpanded={true} onToggle={onCollapse} title="Budget Overview" />
            </div>
                
            {/* Expanded Content */}
            <div className="px-4 pb-5 sm:px-5">
                {/* Main Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mt-4 mb-6">
                        <div className="flex-1 p-3 rounded-2xl bg-gray-100">
                            <p className="text-xs font-medium mb-0.5 text-gray-500">Income</p>
                            <p className="text-lg font-bold text-gray-900">{formatAmount(totalIncome)}</p>
                        </div>
                        <div 
                            className="flex-1 p-3 rounded-2xl"
                            style={{ backgroundColor: 'rgba(255, 59, 48, 0.06)' }}
                        >
                            <p className="text-xs font-medium mb-0.5 text-gray-500">Spent</p>
                            <p className="text-lg font-bold" style={{ color: '#FF3B30' }}>{formatAmount(totalSpent)}</p>
                        </div>
                        <div 
                            className="flex-1 p-3 rounded-2xl"
                            style={{ backgroundColor: isOverspent ? 'rgba(255, 59, 48, 0.06)' : 'rgba(52, 199, 89, 0.06)' }}
                        >
                            <p className="text-xs font-medium mb-0.5 text-gray-500">
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
                        <span className="text-sm font-medium text-gray-900">Income Used</span>
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
                        <span className="text-xs text-gray-400">{formatAmount(0)}</span>
                        <span className="text-xs text-gray-400">{formatAmount(totalIncome)}</span>
                    </div>
                </div>
                
                {/* Budget vs Spent Progress (only if budget is set) */}
                {totalBudgeted > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900">Budget Used</span>
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
                            <span className="text-xs text-gray-400">$0</span>
                            <span className="text-xs text-gray-400">Budget: {formatAmount(totalBudgeted)}</span>
                        </div>
                    </div>
                )}
                
                {/* Category Breakdown Section */}
                {categoryBreakdown.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold mb-4 text-gray-900">Spending by Category</h3>
                        
                        <div className="flex flex-col sm:flex-row gap-6">
                            {/* Donut Chart */}
                            {donutSegments.length > 0 && (
                                <div className="flex-shrink-0 flex justify-center sm:justify-start">
                                    <DonutChart 
                                        segments={donutSegments}
                                        size={120}
                                        strokeWidth={12}
                                        centerContent={
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-gray-900 text-center leading-tight">{formatAmount(totalSpent)}</p>
                                                <p className="text-xs text-gray-500">Total</p>
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
                                        <span className="text-sm flex-1 truncate text-gray-900">{cat.name}</span>
                                        <span className="text-sm font-medium text-gray-500">
                                            {formatAmount(cat.spent)}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {totalSpent > 0 ? ((cat.spent / totalSpent) * 100).toFixed(0) : 0}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Category Budget Progress (detailed) */}
                {categoryBreakdown.some(c => c.budget > 0 || c.spent > 0) && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <h3 className="text-sm font-semibold mb-4 text-gray-900">Category Budgets</h3>
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