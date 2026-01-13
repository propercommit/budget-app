"use client"

import { useState } from "react"

interface Segment {
    value: number;
    color: string;
    category: string;
}

interface SegmentedCircularProgressProps {
    segments: Segment[];
    size?: number;
    strokeWidth?: number;
    label: string;
}

export function SegmentedCircularProgress({
    segments,
    size = 140,
    strokeWidth = 12,
    label,
}: SegmentedCircularProgressProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const totalValue = segments.reduce((sum, seg) => sum + seg.value, 0);

    const segmentArcs = segments.map((segment, index) => {
        const percentage = totalValue > 0 ? segment.value / totalValue : 0;
        const segmentLength = circumference * percentage;
        
        const offset = segments
            .slice(0, index)
            .reduce((sum, s) => {
                const pct = totalValue > 0 ? s.value / totalValue : 0;
                return sum + circumference * pct;
            }, 0);

        return {
            ...segment,
            length: segmentLength,
            offset,
            percentage: percentage * 100,
        };
    });

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative inline-flex items-center justify-center p-2 rounded-full bg-muted/30 shadow-inner">
                <svg width={size} height={size} className="transform -rotate-90 overflow-visible">
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        className="text-muted/30"
                    />
                    {segmentArcs.map((segment, index) => (
                        <g key={index}>
                            <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke={segment.color}
                                strokeWidth={hoveredIndex === index ? strokeWidth + 4 : strokeWidth}
                                strokeDasharray={`${segment.length} ${circumference}`}
                                strokeDashoffset={-segment.offset}
                                strokeLinecap="butt"
                                className="transition-all duration-200 ease-in-out cursor-pointer"
                                style={{
                                    opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.5,
                                }}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                onClick={() => setHoveredIndex(hoveredIndex === index ? null : index)}
                            />
                            <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke="transparent"
                                strokeWidth={strokeWidth + 10}
                                strokeDasharray={`${segment.length} ${circumference}`}
                                strokeDashoffset={-segment.offset}
                                strokeLinecap="butt"
                                className="cursor-pointer"
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                onClick={() => setHoveredIndex(hoveredIndex === index ? null : index)}
                            />
                        </g>
                    ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    {hoveredIndex !== null ? (
                        <>
                            <span className="text-2xl font-bold text-foreground">${segmentArcs[hoveredIndex].value.toFixed(0)}</span>
                            <span className="text-xs text-muted-foreground mt-1 max-w-[80px] text-center leading-tight">
                                {segmentArcs[hoveredIndex].category}
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="text-2xl font-bold text-foreground">${totalValue.toFixed(0)}</span>
                            <span className="text-xs text-muted-foreground mt-1">Total</span>
                        </>
                    )}
                </div>
            </div>
            <span className="text-sm font-medium text-muted-foreground text-center">{label}</span>
            <div className="flex flex-wrap gap-2 justify-center max-w-[200px]">
                {segmentArcs
                    .filter((seg) => seg.value > 0)
                    .map((segment, index) => (
                        <div 
                            key={index} 
                            className="flex items-center gap-1.5 text-xs cursor-pointer"
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            <div 
                                className="w-2.5 h-2.5 rounded-full" 
                                style={{ backgroundColor: segment.color }} 
                            />
                            <span className="text-muted-foreground">{segment.category}</span>
                        </div>
                    ))}
            </div>
        </div>
    );
}