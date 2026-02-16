import { formatAmount } from "@/lib/utils";

interface IncomeCardCollapsedProps {
    totalIncome: number;
    activeTotal: number;
    passiveTotal: number;
    activePercentage: number;
    passivePercentage: number;
    onAdd: () => void;
    hoveredType: 'active' | 'passive' | null;
    setHoveredType: (type: 'active' | 'passive' | null) => void;
}

export function IncomeCardCollapsed({
    totalIncome, 
    activeTotal, 
    passiveTotal, 
    activePercentage, 
    passivePercentage, 
    onAdd,
    hoveredType,
    setHoveredType
}: IncomeCardCollapsedProps) {
    const circumference = 2 * Math.PI * 65;
    const activeLength = circumference * (activePercentage / 100);
    const passiveLength = circumference * (passivePercentage / 100);
    const isEmpty = totalIncome === 0;

    const getCenterText = () => {
        if (isEmpty) return { amount: '$0', label: 'No income yet' };
        if (hoveredType === 'active') return { amount: formatAmount(activeTotal), label: 'Active Income' };
        if (hoveredType === 'passive') return { amount: formatAmount(passiveTotal), label: 'Passive Income' };
        return { amount: formatAmount(totalIncome), label: 'Total Income' };
    };

    const centerText = getCenterText();

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative w-[160px] h-[160px]">
                <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
                    {isEmpty ? (
                        <circle
                            cx="80"
                            cy="80"
                            r="65"
                            fill="none"
                            stroke="#E5E5EA"
                            strokeWidth="14"
                            strokeDasharray="8 4"
                        />
                    ) : (
                        <>
                            {activePercentage > 0 && (
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="65"
                                    fill="none"
                                    stroke="#007AFF"
                                    strokeWidth="14"
                                    strokeDasharray={`${activeLength} ${circumference}`}
                                    style={{
                                        transform: hoveredType === 'active' ? 'scale(1.05)' : 'scale(1)',
                                        transformOrigin: 'center',
                                        transition: 'transform 0.2s ease-out, opacity 0.2s ease-out',
                                        opacity: hoveredType === 'passive' ? 0.4 : 1
                                    }}
                                />
                            )}
                            {passivePercentage > 0 && (
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="65"
                                    fill="none"
                                    stroke="#FF9500"
                                    strokeWidth="14"
                                    strokeDasharray={`${passiveLength} ${circumference}`}
                                    strokeDashoffset={-activeLength}
                                    style={{
                                        transform: hoveredType === 'passive' ? 'scale(1.05)' : 'scale(1)',
                                        transformOrigin: 'center',
                                        transition: 'transform 0.2s ease-out, opacity 0.2s ease-out',
                                        opacity: hoveredType === 'active' ? 0.4 : 1
                                    }}
                                />
                            )}
                        </>
                    )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-200">
                    <span 
                        className="text-xl font-semibold transition-colors duration-200"
                        style={{ 
                            color: hoveredType === 'active' ? '#007AFF' : hoveredType === 'passive' ? '#FF9500' : '#1D1D1F'
                        }}
                    >
                        {centerText.amount}
                    </span>
                    <span className="text-xs text-gray-500">{centerText.label}</span>
                </div>
            </div>
            
            {isEmpty ? (
                <button 
                    onClick={onAdd}
                    className="w-full py-4 px-6 rounded-2xl text-white font-semibold flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#007AFF', boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)' }}
                >
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <span>Add your first income</span>
                </button>
            ) : (
                <div className="flex gap-4">
                    <div 
                        className="flex items-center gap-2 cursor-pointer transition-opacity duration-200"
                        style={{ opacity: hoveredType === 'passive' ? 0.3 : 1 }}
                        onMouseEnter={() => setHoveredType('active')}
                        onMouseLeave={() => setHoveredType(null)}
                    >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#007AFF' }} />
                        <p className="text-sm text-gray-500">{Math.round(activePercentage)}% Active</p>
                    </div>
                    <div 
                        className="flex items-center gap-2 cursor-pointer transition-opacity duration-200"
                        style={{ opacity: hoveredType === 'active' ? 0.3 : 1 }}
                        onMouseEnter={() => setHoveredType('passive')}
                        onMouseLeave={() => setHoveredType(null)}
                    >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FF9500' }} />
                        <p className="text-sm text-gray-500">{Math.round(passivePercentage)}% Passive</p>
                    </div>
                </div>
            )}
        </div>
    );
}