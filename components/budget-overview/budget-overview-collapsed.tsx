import { useSettings } from "@/lib/settings-context";

interface BudgetOverviewCollapsedProps {
    totalIncome: number;
    totalSpent: number;
    onExpand: () => void;
}

export function BudgetOverviewCollapsed({ totalIncome, totalSpent, onExpand }: BudgetOverviewCollapsedProps) {
    const remaining = totalIncome - totalSpent;
    const isOverspent = totalSpent > totalIncome;
    const incomeUsedPercent = totalIncome > 0 ? (totalSpent / totalIncome) * 100 : 0;
    const { formatAmount } = useSettings(); 

    return (
        <div 
            className="bg-white rounded-3xl overflow-hidden transition-all duration-300"
            style={{ boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)', border: '1px solid rgba(0, 0, 0, 0.04)' }}
        >
            <div className="p-4 sm:p-5 cursor-pointer" onClick={onExpand}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
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
                                {isOverspent 
                                    ? "You're overspending" 
                                    : `${(100 - incomeUsedPercent).toFixed(0)}% of income remaining`
                                }
                            </p>
                        </div>
                    </div>
                    <button
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            onExpand();
                        }}
                    >
                        <svg 
                            className="w-5 h-5 text-gray-500"
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
                
                {/* Quick Stats Row */}
                <div className="space-y-3">
                    <div className="flex gap-3">
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
                    
                    {/* Mini Progress Bar */}
                    <div 
                        className="p-3 rounded-2xl"
                        style={{ backgroundColor: isOverspent ? 'rgba(255, 59, 48, 0.06)' : '#F5F5F7' }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-500">Income Used</span>
                            <span 
                                className="text-xs font-semibold"
                                style={{ color: isOverspent ? '#FF3B30' : '#1D1D1F' }}
                            >
                                {incomeUsedPercent.toFixed(0)}%
                            </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full overflow-hidden bg-gray-200">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ 
                                    width: `${Math.min(incomeUsedPercent, 100)}%`,
                                    backgroundColor: isOverspent ? '#FF3B30' : '#007AFF'
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}