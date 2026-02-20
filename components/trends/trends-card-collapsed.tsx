"use client";

import { StatBox } from "./stat-box";

interface TrendsCardCollapsedProps {
    spendingStats: { current: number; change: number };
    incomeStats: { current: number; change: number };
    netCurrent: number;
    isNetPositive: boolean;
    spendingData: { label: string; value: number }[];
    incomeData: { label: string; value: number }[];
}

export function TrendsCardCollapsed({
    spendingStats,
    incomeStats,
    netCurrent,
    isNetPositive,
    spendingData,
    incomeData,
}: TrendsCardCollapsedProps) {
    return (
        <div className="space-y-3">
            <div className="flex gap-3">
                <StatBox
                    label="Spending"
                    value={spendingStats.current}
                    change={spendingStats.change}
                    color="#FF3B30"
                    bgColor="rgba(255, 59, 48, 0.06)"
                    sparklineData={spendingData}
                />
                <StatBox
                    label="Income"
                    value={incomeStats.current}
                    change={incomeStats.change}
                    color="#34C759"
                    bgColor="rgba(52, 199, 89, 0.06)"
                    sparklineData={incomeData}
                />
            </div>

            {/* Net Savings Row */}
            <div
                className="p-3 rounded-2xl flex items-center justify-between"
                style={{ backgroundColor: isNetPositive ? "rgba(52, 199, 89, 0.08)" : "rgba(255, 59, 48, 0.08)" }}
            >
                <div>
                    <p className="text-xs font-medium mb-0.5" style={{ color: "#6E6E73" }}>
                        {isNetPositive ? "Net Savings" : "Net Loss"}
                    </p>
                    <p className="text-xl font-bold" style={{ color: isNetPositive ? "#34C759" : "#FF3B30" }}>
                        {isNetPositive ? "+" : "-"}${Math.abs(netCurrent).toLocaleString()}
                    </p>
                </div>
                <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: isNetPositive ? "rgba(52, 199, 89, 0.15)" : "rgba(255, 59, 48, 0.15)" }}
                >
                    <svg
                        className="w-6 h-6"
                        style={{ color: isNetPositive ? "#34C759" : "#FF3B30" }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        {isNetPositive ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        )}
                    </svg>
                </div>
            </div>
        </div>
    );
}