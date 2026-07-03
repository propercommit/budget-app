import React from "react";

export interface DonutSegment {
    value: number;
    color: string;
    /** Per-segment overrides (e.g. hover scale/opacity). Merged over the default transition. */
    style?: React.CSSProperties;
    /** Hover handlers for segment-level interactions (e.g. dimming the other segments). */
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

interface DonutChartProps {
    segments: DonutSegment[];
    size?: number;
    strokeWidth?: number;
    /** Defaults to (size - strokeWidth) / 2. Override to inset the ring. */
    radius?: number;
    /** Background track color behind the segments. Omit for no track. */
    trackColor?: string;
    /** Rendered inside the svg when the segments total to 0 (e.g. a dashed placeholder ring). */
    emptyContent?: React.ReactNode;
    centerContent?: React.ReactNode;
}

export function DonutChart({
    segments,
    size = 120,
    strokeWidth = 12,
    radius = (size - strokeWidth) / 2,
    trackColor,
    emptyContent,
    centerContent,
}: DonutChartProps) {
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    const total = segments.reduce((sum, s) => sum + s.value, 0);

    // Pre-calculate offsets for each segment
    const segmentsWithOffsets = segments.reduce<{ segment: DonutSegment; offset: number; length: number }[]>(
        (acc, segment) => {
            const percentage = total > 0 ? segment.value / total : 0;
            const segmentLength = percentage * circumference;
            const previousOffset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].length : 0;

            acc.push({
                segment,
                offset: previousOffset,
                length: segmentLength,
            });

            return acc;
        },
        []
    );

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                {trackColor && (
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke={trackColor}
                        strokeWidth={strokeWidth}
                    />
                )}
                {total > 0
                    ? segmentsWithOffsets.map(({ segment, offset, length }, i) => (
                          <circle
                              key={i}
                              cx={center}
                              cy={center}
                              r={radius}
                              fill="none"
                              stroke={segment.color}
                              strokeWidth={strokeWidth}
                              strokeDasharray={`${length} ${circumference - length}`}
                              strokeDashoffset={-offset}
                              style={{ transition: "stroke-dasharray 0.5s ease", ...segment.style }}
                              onMouseEnter={segment.onMouseEnter}
                              onMouseLeave={segment.onMouseLeave}
                          />
                      ))
                    : emptyContent}
            </svg>
            {centerContent && (
                <div className="absolute inset-0 flex items-center justify-center">
                    {centerContent}
                </div>
            )}
        </div>
    );
}
