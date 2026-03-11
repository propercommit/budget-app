import { useSettings } from "@/lib/settings-context";
import { CardHeader } from "../ui/card-header";

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
                <CardHeader isExpanded={false} onToggle={onExpand} title="Budget Overview" />
                
                {/* Quick Stats Row */}
                <div className="mt-4 space-y-3">
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