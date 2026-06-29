import { useSettings } from "@/lib/settings-context";
import { DonutChart } from "../ui/donut-chart";

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
    hoveredType,
}: IncomeCardCollapsedProps) {
    const isEmpty = totalIncome === 0;
    const { formatAmount } = useSettings();

    const getCenterText = () => {
        if (isEmpty) return { amount: formatAmount(0), label: 'No income yet' };
        if (hoveredType === 'active') return { amount: formatAmount(activeTotal), label: 'Active Income' };
        if (hoveredType === 'passive') return { amount: formatAmount(passiveTotal), label: 'Passive Income' };
        return { amount: formatAmount(totalIncome), label: 'Total Income' };
    };

    const centerText = getCenterText();

    const segments = [
        {
            value: activePercentage,
            color: '#007AFF',
            style: {
                transition: 'opacity 0.2s ease-out',
                opacity: hoveredType === 'passive' ? 0.4 : 1,
            },
        },
        {
            value: passivePercentage,
            color: '#FF9500',
            style: {
                transition: 'opacity 0.2s ease-out',
                opacity: hoveredType === 'active' ? 0.4 : 1,
            },
        },
    ];

    return (
        <div className="flex flex-col items-center gap-4">
            <DonutChart
                segments={segments}
                size={160}
                strokeWidth={14}
                radius={65}
                emptyContent={
                    <circle
                        cx="80"
                        cy="80"
                        r="65"
                        fill="none"
                        stroke="#E5E5EA"
                        strokeWidth="14"
                        strokeDasharray="8 4"
                    />
                }
                centerContent={
                    <div className="flex flex-col items-center justify-center transition-all duration-200">
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
                }
            />
        </div>
    );
}
