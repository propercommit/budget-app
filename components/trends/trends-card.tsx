"use client";

import { useState } from "react";
import { TrendsCardCollapsed } from "./trends-card-collapsed";
import { TrendsCardExpanded } from "./trends-card-expanded";
import { CardHeader } from "../ui/card-header";

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
                    <CardHeader
                        isExpanded={isExpanded}
                        onToggle={() => setIsExpanded(!isExpanded)}
                        title="Trends"
                    />
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