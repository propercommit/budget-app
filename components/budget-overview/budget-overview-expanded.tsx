import { iconMap } from "@/lib/icon-map";
import { useSettings } from "@/lib/settings-context";

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
                    <span className="text-sm text-gray-500 flex-shrink-0 ml-2">
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
            <div 
                className="p-4 sm:p-5 cursor-pointer"
                onClick={onCollapse}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div 
                            className="w-11 h-11 rounded-2xl flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(0, 122, 255, 0.1)' }}
                        >
                            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">Budget Overview</h2>
                            <p 
                                className="text-xs"
                                style={{ color: isOverspent ? '#FF3B30' : '#6E6E73' }}
                            >
                            </p>
                        </div>
                    </div>
                    <button
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            onCollapse();
                        }}
                    >
                        <svg 
                            className="w-5 h-5 text-gray-500 rotate-180"
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            </div>
            
            {/* Expanded Content */}
            <div className="px-4 pb-5 sm:px-5">
                {/* Main Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mb-6">
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
                                                <p className="text-lg font-bold text-gray-900">{formatAmount(totalSpent)}</p>
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