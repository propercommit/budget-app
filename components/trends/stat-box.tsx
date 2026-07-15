"use client";

import { Sparkline } from "./sparkline";
import { useSettings } from "@/lib/settings-context";

interface StatBoxProps {
    label: string;
    value: number;
    /** Percent change vs the previous month; `null` hides the badge (no prior month to compare against). */
    change: number | null;
    color: string;
    bgColor: string;
    sparklineData: { label: string; value: number }[];
}

export function StatBox({ label, value, change, color, bgColor, sparklineData }: StatBoxProps) {
    const isPositive = change !== null && change >= 0;
    const isSpending = label.toLowerCase().includes("spending");
    const isGood = isSpending ? isPositive === false : isPositive;
    const { formatAmount } = useSettings();

    return (
        <div className="flex-1 p-3 rounded-2xl" style={{ backgroundColor: bgColor }}>
            <div className="flex items-start justify-between mb-1">
                <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>{label}</p>
                <Sparkline data={sparklineData} color={color} width={44} height={22} />
            </div>
            <p className="text-xl font-bold mb-0.5" style={{ color: "var(--foreground)" }}>
                {formatAmount(value)}
            </p>
            {change !== null && (
                <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold" style={{ color: isGood ? "#34C759" : "#FF3B30" }}>
                        {isPositive ? "↑" : "↓"}{Math.abs(change).toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground/70">vs last</span>
                </div>
            )}
        </div>
    );
}