"use client";

interface SparklineProps {
    data: { label: string; value: number }[];
    color: string;
    width?: number;
    height?: number;
}

export function Sparkline({ data, color, width = 48, height = 24 }: SparklineProps) {
    if (!data || data.length < 2) return null;

    const values = data.map(d => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    const padding = 3;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = values.map((v, i) => {
        const x = padding + (i / (values.length - 1)) * chartWidth;
        const y = padding + chartHeight - ((v - min) / range) * chartHeight;
        return `${x},${y}`;
    }).join(" ");

    return (
        <svg width={width} height={height}>
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}