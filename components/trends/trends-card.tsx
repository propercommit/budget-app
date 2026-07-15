"use client";

import { useState } from "react";
import { TrendsCardCollapsed } from "./trends-card-collapsed";
import { TrendsCardExpanded } from "./trends-card-expanded";
import { TrendsEmptyState } from "./trends-empty-state";
import { CardHeader } from "../ui/card-header";
import { getTrendStats, TrendDataPoint } from "./trend-stats";

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
    /** First-run: render the "Unlocks after month 1" body instead of the stat boxes. */
    isEmpty?: boolean;
}

export function TrendsCard({ spendingData, incomeData, categoryData, categories, isEmpty = false }: TrendsCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const spendingStats = getTrendStats(spendingData);
    const incomeStats = getTrendStats(incomeData);

    const netCurrent = incomeStats.current - spendingStats.current;
    const netPrevious = incomeStats.previous - spendingStats.previous;
    const isNetPositive = netCurrent >= 0;

    return (
        <div
            className="w-full"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}
        >
            <div
                className="bg-card rounded-3xl overflow-hidden transition-all duration-300 border border-(--card-border) shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
            >
                {/* Header */}
                <div className="p-4 sm:p-5 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                    <CardHeader
                        isExpanded={isExpanded}
                        onToggle={() => setIsExpanded(!isExpanded)}
                        title="Trends"
                    />
                    {!isExpanded && (isEmpty ? (
                        <TrendsEmptyState />
                    ) : (
                        <TrendsCardCollapsed
                            spendingStats={{ current: spendingStats.current, change: spendingStats.change }}
                            incomeStats={{ current: incomeStats.current, change: incomeStats.change }}
                            netCurrent={netCurrent}
                            isNetPositive={isNetPositive}
                            spendingData={spendingData}
                            incomeData={incomeData}
                        />
                    ))}
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