import { Switch } from "./ui/switch";

interface ChartHeaderProps {
    latestValue: number;
    previousValue: number | null;
    showValues: boolean;
    onToggleValues: () => void;
    increaseIsPositive?: boolean;
}

export function ChartHeader({ 
    latestValue, 
    previousValue, 
    increaseIsPositive = false,
}: ChartHeaderProps) {
    const hasComparison = previousValue !== null && previousValue !== undefined;
    const change = hasComparison && previousValue > 0 
        ? ((latestValue - previousValue) / previousValue) * 100 
        : 0;
    const absoluteChange = hasComparison ? latestValue - previousValue : 0;

    const isPositiveChange = increaseIsPositive ? change >= 0 : change < 0;

    return (
        <div className="mb-6 flex items-start justify-between">
            <div>
                <div className="text-3xl sm:text-4xl font-bold mb-1">
                    ${latestValue.toLocaleString()}
                </div>
                {hasComparison ? (
                    <div className="flex items-center gap-2 text-sm">
                        <span className={isPositiveChange ? "text-green-500" : "text-red-500"}>
                            {change >= 0 ? "↑" : "↓"}
                            {Math.abs(change).toFixed(1)}%
                        </span>
                        <span className="text-muted-foreground">
                            ${Math.abs(absoluteChange).toLocaleString()} USD
                        </span>
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground">No previous data</div>
                )}
            </div>
        </div>
    );
}