"use client"

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { X } from "lucide-react";
import { Category } from "@/lib/category";
import { SpendingItem } from "./spending-categories-card";

interface MonthData {
    month: string;
    spending: SpendingItem[];
}

interface SpendingTrendsCardProps {
    historicalData: MonthData[];
    categories: Category[];
    onClose: () => void;
}

interface ChartPoint {
    x: number;
    y: number;
    value: number;
    label: string;
}

export function SpendingTrendsCard({ historicalData, categories, onClose }: SpendingTrendsCardProps) {
    const [showAllValues, setShowAllValues] = useState<Record<string, boolean>>({});
    const [hoveredPoints, setHoveredPoints] = useState<Record<string, ChartPoint | null>>({});

    const toggleShowValues = (graphId: string) => {
        setShowAllValues(prev => ({ ...prev, [graphId]: !prev[graphId] }));
    };

    const setHoveredPoint = (graphId: string, point: ChartPoint | null) => {
        setHoveredPoints(prev => ({ ...prev, [graphId]: point }));
    };

    const overallData = historicalData.map(monthData => {
        const totalSpent = monthData.spending.reduce((sum, item) => sum + item.spent, 0);
        const date = new Date(monthData.month + "-01");
        return {
            monthLabel: date.toLocaleDateString("en-US", { month: "short" }),
            value: totalSpent,
        };
    });

    const categoryData = categories.map(category => {
        const data = historicalData.map(monthData => {
            const categorySpent = monthData.spending
                .filter(item => item.category === category.label)
                .reduce((sum, item) => sum + item.spent, 0);
            const date = new Date(monthData.month + "-01");
            return {
                monthLabel: date.toLocaleDateString("en-US", { month: "short" }),
                value: categorySpent,
            };
        });
        
        const hasSpending = data.some(d => d.value > 0);
        
        return {
            category,
            data,
            hasSpending,
        };
    }).filter(c => c.hasSpending);

    const renderAreaLineChart = (
        data: { monthLabel: string; value: number }[],
        color: string,
        chartHeight: number = 180,
        graphId: string,
    ) => {
        if (data.length === 0 || data.every(d => d.value === 0)) {
            return (
                <div className="relative w-full bg-gradient-to-b from-background to-muted/20 rounded-xl p-8 flex items-center justify-center min-h-[200px]">
                    <p className="text-center text-muted-foreground">
                        Not enough data to display the graph
                    </p>
                </div>
            );
        }

        const maxValue = Math.max(...data.map(d => d.value), 1);
        const minValue = Math.min(...data.map(d => d.value), 0);
        const valueRange = maxValue - minValue || 1;

        const latestValue = data[data.length - 1]?.value || 0;
        const previousValue = data.length >= 2 ? data[data.length - 2]?.value : null;

        const hasComparison = previousValue !== null && previousValue !== undefined;
        const change = hasComparison && previousValue > 0 
            ? ((latestValue - previousValue) / previousValue) * 100 
            : 0;
        const absoluteChange = hasComparison ? latestValue - previousValue : 0;

        const padding = 40;
        const width = 600;
        const height = chartHeight;

        const points: ChartPoint[] = data.map((d, i) => {
            const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((d.value - minValue) / valueRange) * (height - 2 * padding);
            return { x, y, value: d.value, label: d.monthLabel };
        });

        const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
        const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

        const gradientId = `gradient-${graphId.replace(/[^a-zA-Z0-9]/g, "-")}`;
        const animId = graphId.replace(/[^a-zA-Z0-9]/g, "-");
        const displayPoint = hoveredPoints[graphId] || null;

        const lineAnimationDuration = 1.5;
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

        return (
            <div className="relative w-full bg-gradient-to-b from-background to-muted/20 rounded-xl p-4 sm:p-6 overflow-hidden">
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <div className="text-3xl sm:text-4xl font-bold mb-1">
                            ${latestValue.toLocaleString()}
                        </div>
                        {hasComparison ? (
                            <div className="flex items-center gap-2 text-sm">
                                <span className={change >= 0 ? "text-red-500" : "text-green-500"}>
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
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-muted-foreground cursor-pointer">
                            Display Values
                        </label>
                        <Switch 
                            checked={showAllValues[graphId] || false} 
                            onCheckedChange={() => toggleShowValues(graphId)}
                        />
                    </div>
                </div>

                <div className="relative w-full overflow-x-auto">
                    <svg 
                        viewBox={`0 0 ${width} ${height}`} 
                        className="w-full" 
                        style={{ minWidth: "400px" }}
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

                        {/* Area fill with fade-in animation */}
                        <path 
                            d={areaPath} 
                            fill={`url(#${gradientId})`}
                            style={{
                                opacity: 0,
                                animation: `fadeIn-${animId} 0.5s ease-out ${lineAnimationDuration}s forwards`,
                            }}
                        />

                        {/* Line with draw animation */}
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
                                animation: `drawLine-${animId} ${lineAnimationDuration}s ease-out forwards`,
                            }}
                        />

                        {/* Points appear as line reaches them */}
                        {points.map((p, i) => (
                            <g 
                                key={i}
                                style={{
                                    opacity: 0,
                                    transformOrigin: `${p.x}px ${p.y}px`,
                                    animation: `popIn-${animId} 0.3s ease-out ${pointDelays[i]}s forwards`,
                                }}
                            >
                                {/* Invisible larger hitbox */}
                                <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r="20"
                                    fill="transparent"
                                    onMouseEnter={() => setHoveredPoint(graphId, p)}
                                    onMouseLeave={() => setHoveredPoint(graphId, null)}
                                    className="cursor-pointer"
                                />
                                {/* Visible point */}
                                <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={displayPoint?.x === p.x && displayPoint?.y === p.y ? 6 : 4}
                                    fill="white"
                                    stroke={color}
                                    strokeWidth="2"
                                    className="transition-all pointer-events-none"
                                />
                                {/* Glow on last point */}
                                {i === points.length - 1 && (
                                    <circle 
                                        cx={p.x} 
                                        cy={p.y} 
                                        r="8" 
                                        fill={color} 
                                        opacity="0.3" 
                                        className="pointer-events-none" 
                                    />
                                )}
                            </g>
                        ))}

                        {/* Value labels with staggered fade-in */}
                        {showAllValues[graphId]
                            ? points.map((p, i) => (
                                <text
                                    key={i}
                                    x={p.x}
                                    y={p.y - 15}
                                    textAnchor="middle"
                                    className="text-sm font-bold fill-foreground"
                                    style={{ 
                                        filter: "drop-shadow(0 2px 4px rgb(255 255 255 / 0.8))",
                                        opacity: 0,
                                        animation: `fadeIn-${animId} 0.3s ease-out ${i * 0.1}s forwards`,
                                    }}
                                >
                                    ${p.value.toLocaleString()}
                                </text>
                            ))
                            : displayPoint && (
                                <text
                                    x={displayPoint.x}
                                    y={displayPoint.y - 15}
                                    textAnchor="middle"
                                    className="text-sm font-bold fill-foreground"
                                    style={{ filter: "drop-shadow(0 2px 4px rgb(255 255 255 / 0.8))" }}
                                >
                                    ${displayPoint.value.toLocaleString()}
                                </text>
                            )}

                        {/* Month labels appear with their points */}
                        {points.map((p, i) => (
                            <text
                                key={`label-${i}`}
                                x={p.x}
                                y={height - 10}
                                textAnchor="middle"
                                className="text-[10px] fill-muted-foreground"
                                style={{
                                    opacity: 0,
                                    animation: `fadeIn-${animId} 0.2s ease-out ${pointDelays[i]}s forwards`,
                                }}
                            >
                                {p.label}
                            </text>
                        ))}
                    </svg>
                </div>
            </div>
        );
    };

    return (
        <Card className="mt-6 border-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle>Spending Trends & Evolution</CardTitle>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="w-4 h-4" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* Overall Spending Chart */}
                <div>
                    <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Overall Spending</h3>
                    {renderAreaLineChart(overallData, "#8b5cf6", 180, "overall")}
                </div>

                {/* Category Charts */}
                <div>
                    <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Spending by Category</h3>
                    <div className="space-y-6">
                        {categoryData.map(({ category, data }) => (
                            <div key={category.label}>
                                <div className="flex items-center gap-2 mb-2">
                                    <div 
                                        className="w-3 h-3 rounded-full" 
                                        style={{ backgroundColor: category.color }}
                                    />
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {category.label}
                                    </span>
                                </div>
                                {renderAreaLineChart(data, category.color, 160, `category-${category.label}`)}
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}