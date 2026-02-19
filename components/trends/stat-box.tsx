"use client";

import { Sparkline } from "./sparkline";

interface StatBoxProps {
    label: string;
    value: number;
    change: number;
    color: string;
    bgColor: string;
    sparklineData: { label: string; value: number }[];
}

export function StatBox({ label, value, change, color, bgColor, sparklineData }: StatBoxProps) {
    const isPositive = change >= 0;
    const isSpending = label.toLowerCase().includes("spending");
    const isGood = isSpending ? !isPositive : isPositive;

    return (
        <div className="flex-1 p-3 rounded-2xl" style={{ backgroundColor: bgColor }}>
            <div className="flex items-start justify-between mb-1">
                <p className="text-xs font-medium" style={{ color: "#6E6E73" }}>{label}</p>
                <Sparkline data={sparklineData} color={color} width={44} height={22} />
            </div>
            <p className="text-xl font-bold mb-0.5" style={{ color: "#1D1D1F" }}>
                ${value.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
                <span className="text-xs font-semibold" style={{ color: isGood ? "#34C759" : "#FF3B30" }}>
                    {isPositive ? "↑" : "↓"}{Math.abs(change).toFixed(1)}%
                </span>
                <span className="text-xs" style={{ color: "#AEAEB2" }}>vs last</span>
            </div>
        </div>
    );
}