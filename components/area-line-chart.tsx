"use client"

import { useState } from "react";
import { ChartHeader } from "./chart-header";
import { AnimatedPoint } from "./animated-point";
import { ValueLabel } from "./value-label";
import { MonthLabel } from "./month-label";
import { ChartPoint, useChartCalculations } from "./hooks/use-chart-calculations";

interface AreaLineChartProps {
    data: { monthLabel: string; value: number }[];
    color: string;
    height?: number;
    graphId: string;
    increaseIsPositive?: boolean;
}

const LINE_ANIMATION_DURATION = 1.5;
const PADDING = 40;
const MIN_POINT_SPACING = 60; // Minimum pixels between points
const MIN_CHART_WIDTH = 300; // Minimum chart width
const MAX_VISIBLE_POINTS_MOBILE = 6; // Show at most 6 points without scrolling on mobile

export function AreaLineChart({
    data,
    color,
    height: chartHeight = 180,
    graphId,
    increaseIsPositive = false,
}: AreaLineChartProps) {
    const [showValues, setShowValues] = useState(false);
    const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);

    // Calculate dynamic width based on data points
    const dataPointCount = data.length;
    const calculatedWidth = Math.max(
        MIN_CHART_WIDTH,
        PADDING * 2 + (dataPointCount - 1) * MIN_POINT_SPACING
    );
    
    // Determine if scrolling is needed (more than MAX_VISIBLE_POINTS_MOBILE points)
    const needsScroll = dataPointCount > MAX_VISIBLE_POINTS_MOBILE;
    const chartWidth = needsScroll ? calculatedWidth : Math.max(MIN_CHART_WIDTH, calculatedWidth);

    const calculations = useChartCalculations({
        data,
        height: chartHeight,
        padding: PADDING,
        width: chartWidth,
        lineAnimationDuration: LINE_ANIMATION_DURATION,
    });

    if (!calculations) {
        return (
            <div className="relative w-full bg-gradient-to-b from-background to-muted/20 rounded-xl p-8 flex items-center justify-center min-h-[200px]">
                <p className="text-center text-muted-foreground">
                    Not enough data to display the graph
                </p>
            </div>
        );
    }

    const {
        points,
        linePath,
        areaPath,
        totalLineLength,
        pointDelays,
        latestValue,
        previousValue,
    } = calculations;

    const gradientId = `gradient-${graphId.replace(/[^a-zA-Z0-9]/g, "-")}`;
    const animId = graphId.replace(/[^a-zA-Z0-9]/g, "-");

    return (
        <div className="relative w-full bg-gradient-to-b from-background to-muted/20 rounded-xl p-4 sm:p-6 overflow-hidden">
            <ChartHeader
                latestValue={latestValue}
                previousValue={previousValue}
                showValues={showValues}
                onToggleValues={() => setShowValues(!showValues)}
                increaseIsPositive={increaseIsPositive}
            />

            <div 
                className={`relative w-full ${needsScroll ? 'overflow-x-auto' : 'overflow-hidden'}`}
                style={{ 
                    WebkitOverflowScrolling: 'touch' // Smooth scrolling on iOS
                }}
            >
                <svg 
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                    className={needsScroll ? '' : 'w-full'}
                    style={{ 
                        minWidth: needsScroll ? `${chartWidth}px` : undefined,
                        width: needsScroll ? `${chartWidth}px` : '100%',
                    }}
                    preserveAspectRatio="xMidYMid meet"
                >
                    <style>
                        {`
                            @keyframes drawLine-${animId} {
                                to { stroke-dashoffset: 0; }
                            }
                            @keyframes fadeIn-${animId} {
                                to { opacity: 1; }
                            }
                            @keyframes popIn-${animId} {
                                0% { opacity: 0; transform: scale(0); }
                                70% { transform: scale(1.2); }
                                100% { opacity: 1; transform: scale(1); }
                            }
                        `}
                    </style>
                    <defs>
                        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                        </linearGradient>
                    </defs>

                    {/* Area fill */}
                    <path 
                        d={areaPath} 
                        fill={`url(#${gradientId})`}
                        style={{
                            opacity: 0,
                            animation: `fadeIn-${animId} 0.5s ease-out ${LINE_ANIMATION_DURATION}s forwards`,
                        }}
                    />

                    {/* Line */}
                    <path
                        d={linePath}
                        fill="none"
                        stroke={color}
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        style={{
                            strokeDasharray: totalLineLength,
                            strokeDashoffset: totalLineLength,
                            animation: `drawLine-${animId} ${LINE_ANIMATION_DURATION}s ease-out forwards`,
                        }}
                    />

                    {/* Points */}
                    {points.map((p, i) => (
                        <AnimatedPoint
                            key={i}
                            x={p.x}
                            y={p.y}
                            color={color}
                            isHovered={hoveredPoint?.x === p.x && hoveredPoint?.y === p.y}
                            isLast={i === points.length - 1}
                            delay={pointDelays[i]}
                            animId={animId}
                            onMouseEnter={() => setHoveredPoint(p)}
                            onMouseLeave={() => setHoveredPoint(null)}
                        />
                    ))}

                    {/* Value labels */}
                    {showValues
                        ? points.map((p, i) => (
                            <ValueLabel
                                key={i}
                                x={p.x}
                                y={p.y}
                                value={p.value}
                                animId={animId}
                                delay={i * 0.1}
                                animated
                            />
                        ))
                        : hoveredPoint && (
                            <ValueLabel
                                x={hoveredPoint.x}
                                y={hoveredPoint.y}
                                value={hoveredPoint.value}
                            />
                        )}

                    {/* Month labels */}
                    {points.map((p, i) => (
                        <MonthLabel
                            key={`label-${i}`}
                            x={p.x}
                            y={chartHeight - 10}
                            label={p.label}
                            animId={animId}
                            delay={pointDelays[i]}
                        />
                    ))}
                </svg>
            </div>
        </div>
    );
}