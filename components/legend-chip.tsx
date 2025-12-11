
interface LegendChipProps {
    label: string;
    percentage: number;
    color: string;
}

export function LegendChip({label, percentage, color}: LegendChipProps) {
    return (
            <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full bg-${color}-500`}></div>
                <span className="text-sm text-gray-500">{label} {percentage}%</span>
            </div>
    );
}