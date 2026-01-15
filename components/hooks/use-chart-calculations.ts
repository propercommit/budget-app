import { useMemo } from "react";

export interface ChartPoint {
    x: number;
    y: number;
    value: number;
    label: string;
}

interface UseChartCalculationsProps {
    data: { monthLabel: string; value: number }[];
    height: number;
    padding?: number;
    width?: number;
    lineAnimationDuration?: number;
}

export function useChartCalculations({
    data,
    height,
    padding = 40,
    width = 600,
    lineAnimationDuration = 1.5,
}: UseChartCalculationsProps) {
    return useMemo(() => {
        if (data.length === 0 || data.every(d => d.value === 0)) {
            return null;
        }

        const maxValue = Math.max(...data.map(d => d.value), 1);
        const minValue = Math.min(...data.map(d => d.value), 0);
        const valueRange = maxValue - minValue || 1;

        const latestValue = data[data.length - 1]?.value || 0;
        const previousValue = data.length >= 2 ? data[data.length - 2]?.value : null;

        const points: ChartPoint[] = data.map((d, i) => {
            const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((d.value - minValue) / valueRange) * (height - 2 * padding);
            return { x, y, value: d.value, label: d.monthLabel };
        });

        const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
        const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

        let totalLineLength = 0;
        const cumulativeDistances: number[] = [0];
        
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const segmentLength = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
            totalLineLength += segmentLength;
            cumulativeDistances.push(totalLineLength);
        }

        const pointDelays = cumulativeDistances.map(dist => 
            (dist / totalLineLength) * lineAnimationDuration
        );

        return {
            points,
            linePath,
            areaPath,
            totalLineLength,
            pointDelays,
            latestValue,
            previousValue,
        };
    }, [data, height, padding, width, lineAnimationDuration]);
}