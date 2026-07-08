"use client";

import { useState } from "react";
import { AreaLineChart } from "@/components/area-line-chart";
import { CategoryTrendCard } from "./category-trend-card";
import { iconMap } from "@/lib/icon-map";
import { useSettings } from "@/lib/settings-context";

interface CategoryInfo {
    name: string;
    icon: string;
    color: string;
}

interface TrendsCardExpandedProps {
    spendingStats: { current: number; change: number };
    incomeStats: { current: number; change: number };
    netCurrent: number;
    netPrevious: number;
    isNetPositive: boolean;
    spendingData: { label: string; value: number }[];
    incomeData: { label: string; value: number }[];
    categoryData: Record<string, { label: string; value: number }[]>;
    categories: CategoryInfo[];
}

export function TrendsCardExpanded({
    spendingStats,
    incomeStats,
    netCurrent,
    netPrevious,
    isNetPositive,
    spendingData,
    incomeData,
    categoryData,
    categories,
}: TrendsCardExpandedProps) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const selectedCategoryData = selectedCategory ? categoryData[selectedCategory] : null;
    const selectedCategoryInfo = categories.find(c => c.name === selectedCategory);
    const { formatAmount } = useSettings();

    const getStats = (data: { label: string; value: number }[]) => {
        if (!data || data.length < 2) return { current: 0, change: 0 };
        const current = data[data.length - 1].value;
        const previous = data[data.length - 2].value;
        const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
        return { current, change };
    };

    const selectedCategoryStats = selectedCategoryData ? getStats(selectedCategoryData) : null;

    // Transform data for AreaLineChart (needs monthLabel instead of label)
    const toChartData = (data: { label: string; value: number }[]) =>
        data.map(d => ({ monthLabel: d.label, value: d.value }));

    return (
        <div className="px-4 pb-5 sm:px-5">
            {/* Charts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* Spending Chart */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#FF3B30" }} />
                            <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Spending</span>
                        </div>
                        <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{
                                color: spendingStats.change <= 0 ? "#34C759" : "#FF3B30",
                                backgroundColor: spendingStats.change <= 0 ? "rgba(52, 199, 89, 0.1)" : "rgba(255, 59, 48, 0.1)",
                            }}
                        >
                            {spendingStats.change <= 0 ? "↓" : "↑"}{Math.abs(spendingStats.change).toFixed(1)}%
                        </span>
                    </div>
                    <AreaLineChart
                        data={toChartData(spendingData)}
                        color="#FF3B30"
                        height={140}
                        graphId="trends-spending"
                    />
                </div>

                {/* Income Chart */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#34C759" }} />
                            <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Income</span>
                        </div>
                        <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{
                                color: incomeStats.change >= 0 ? "#34C759" : "#FF3B30",
                                backgroundColor: incomeStats.change >= 0 ? "rgba(52, 199, 89, 0.1)" : "rgba(255, 59, 48, 0.1)",
                            }}
                        >
                            {incomeStats.change >= 0 ? "↑" : "↓"}{Math.abs(incomeStats.change).toFixed(1)}%
                        </span>
                    </div>
                    <AreaLineChart
                        data={toChartData(incomeData)}
                        color="#34C759"
                        height={140}
                        graphId="trends-income"
                        increaseIsPositive
                    />
                </div>
            </div>

            {/* Net Summary */}
            <div
                className="p-4 rounded-2xl mb-6"
                style={{ backgroundColor: isNetPositive ? "rgba(52, 199, 89, 0.08)" : "rgba(255, 59, 48, 0.08)" }}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>
                            {isNetPositive ? "You saved this month" : "You overspent this month"}
                        </p>
                        <p className="text-3xl font-bold" style={{ color: isNetPositive ? "#34C759" : "#FF3B30" }}>
                            {isNetPositive ? "+" : "-"}{formatAmount(Math.abs(netCurrent))}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>vs last month</p>
                        <p
                            className="text-lg font-semibold"
                            style={{ color: (netCurrent - netPrevious) >= 0 ? "#34C759" : "#FF3B30" }}
                        >
                            {(netCurrent - netPrevious) >= 0 ? "↑" : "↓"}{formatAmount(Math.abs(netCurrent - netPrevious))}
                        </p>
                    </div>
                </div>
            </div>

            {/* Category Breakdown */}
            {categories.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Spending by Category</h3>
                        {selectedCategory && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedCategory(null); }}
                                className="text-xs font-medium"
                                style={{ color: "#007AFF" }}
                            >
                                Clear selection
                            </button>
                        )}
                    </div>

                    {/* Category Cards */}
                    <div
                        className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1"
                        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                    >
                        {categories.map((cat) => (
                            <CategoryTrendCard
                                key={cat.name}
                                category={cat}
                                data={categoryData[cat.name] || []}
                                isSelected={selectedCategory === cat.name}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCategory(selectedCategory === cat.name ? null : cat.name);
                                }}
                            />
                        ))}
                    </div>

                    {/* Selected Category Detail */}
                    {selectedCategory && selectedCategoryData && selectedCategoryInfo && selectedCategoryStats && (
                        <div
                            className="mt-4 p-4 rounded-2xl"
                            style={{ backgroundColor: `${selectedCategoryInfo.color}08` }}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl [&>svg]:w-5 [&>svg]:h-5">{iconMap[selectedCategoryInfo.icon] || selectedCategoryInfo.icon}</span>
                                    <span className="text-base font-semibold" style={{ color: "var(--foreground)" }}>{selectedCategory}</span>
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedCategoryInfo.color }} />
                                </div>
                                <span
                                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                    style={{
                                        color: selectedCategoryStats.change <= 0 ? "#34C759" : "#FF3B30",
                                        backgroundColor: selectedCategoryStats.change <= 0 ? "rgba(52, 199, 89, 0.1)" : "rgba(255, 59, 48, 0.1)",
                                    }}
                                >
                                    {selectedCategoryStats.change <= 0 ? "↓" : "↑"}{Math.abs(selectedCategoryStats.change).toFixed(1)}%
                                </span>
                            </div>
                            <AreaLineChart
                                data={toChartData(selectedCategoryData)}
                                color={selectedCategoryInfo.color}
                                height={140}
                                graphId={`trends-category-${selectedCategory}`}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}