"use client";

import { useState } from "react";
import { TrendsCardCollapsed } from "./trends-card-collapsed";
import { TrendsCardExpanded } from "./trends-card-expanded";
import { ExpandToggleButton } from "../ui/expand-toogle-button";

interface TrendDataPoint {
    label: string;
    value: number;
}

interface CategoryInfo {
    name: string;
    icon: string;
    color: string;
}

interface TrendsCardProps {
    spendingData: TrendDataPoint[];
    incomeData: TrendDataPoint[];
    categoryData: Record<string, TrendDataPoint[]>;
    categories: CategoryInfo[];
}

function getStats(data: TrendDataPoint[]) {
    if (!data || data.length < 2) return { current: 0, previous: 0, change: 0 };
    const current = data[data.length - 1].value;
    const previous = data[data.length - 2].value;
    const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    return { current, previous, change };
}

export function TrendsCard({ spendingData, incomeData, categoryData, categories }: TrendsCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const spendingStats = getStats(spendingData);
    const incomeStats = getStats(incomeData);

    const netCurrent = incomeStats.current - spendingStats.current;
    const netPrevious = incomeStats.previous - spendingStats.previous;
    const isNetPositive = netCurrent >= 0;

    return (
        <div
            className="w-full"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}
        >
            <div
                className="bg-white rounded-3xl overflow-hidden transition-all duration-300"
                style={{ boxShadow: "0 4px 24px rgba(0, 0, 0, 0.06)", border: "1px solid rgba(0, 0, 0, 0.04)" }}
            >
                {/* Header */}
                <div className="p-4 sm:p-5 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-11 h-11 rounded-2xl flex items-center justify-center"
                                style={{ backgroundColor: "rgba(88, 86, 214, 0.1)" }}
                            >
                                <svg className="w-5 h-5" style={{ color: "#5856D6" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-base font-semibold" style={{ color: "#1D1D1F" }}>Trends</h2>
                            </div>
                        </div>
                        <ExpandToggleButton
                            isExpanded={isExpanded}
                            onToggle={() => setIsExpanded(!isExpanded)}
                        />
                    </div>

                    {!isExpanded && (
                        <TrendsCardCollapsed
                            spendingStats={{ current: spendingStats.current, change: spendingStats.change }}
                            incomeStats={{ current: incomeStats.current, change: incomeStats.change }}
                            netCurrent={netCurrent}
                            isNetPositive={isNetPositive}
                            spendingData={spendingData}
                            incomeData={incomeData}
                        />
                    )}
                </div>

                {isExpanded && (
                    <TrendsCardExpanded
                        spendingStats={{ current: spendingStats.current, change: spendingStats.change }}
                        incomeStats={{ current: incomeStats.current, change: incomeStats.change }}
                        netCurrent={netCurrent}
                        netPrevious={netPrevious}
                        isNetPositive={isNetPositive}
                        spendingData={spendingData}
                        incomeData={incomeData}
                        categoryData={categoryData}
                        categories={categories}
                    />
                )}
            </div>
        </div>
    );
}