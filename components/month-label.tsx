interface MonthLabelProps {
    x: number;
    y: number;
    label: string;
    animId: string;
    delay: number;
}

export function MonthLabel({
    x,
    y,
    label,
    animId,
    delay,
}: MonthLabelProps) {
    return (
        <text
            x={x}
            y={y}
            textAnchor="middle"
            className="text-[10px] fill-muted-foreground"
            style={{
                opacity: 0,
                animation: `fadeIn-${animId} 0.2s ease-out ${delay}s forwards`,
            }}
        >
            {label}
        </text>
    );
}