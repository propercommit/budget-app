import { useSettings } from "@/lib/settings-context";

interface ValueLabelProps {
    x: number;
    y: number;
    value: number;
    animId?: string;
    delay?: number;
    animated?: boolean;
}

export function ValueLabel({
    x,
    y,
    value,
    animId,
    delay = 0,
    animated = false,
}: ValueLabelProps) {
    const { formatAmount } = useSettings();
    return (
        <text
            x={x}
            y={y - 15}
            textAnchor="middle"
            className="text-sm font-bold fill-foreground"
            style={{ 
                filter: "drop-shadow(0 2px 4px rgb(255 255 255 / 0.8))",
                ...(animated && {
                    opacity: 0,
                    animation: `fadeIn-${animId} 0.3s ease-out ${delay}s forwards`,
                }),
            }}
        >
            {formatAmount(value)}
        </text>
    );
}