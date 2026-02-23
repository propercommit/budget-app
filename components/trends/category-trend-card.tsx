"use client";

import { iconMap } from "@/lib/icon-map";
import { MiniAreaChart } from "./mini-area-chart";

interface CategoryTrendCardProps {
    category: { name: string; icon: string; color: string };
    data: { label: string; value: number }[];
    isSelected: boolean;
    onClick: (e: React.MouseEvent) => void;
}

export function CategoryTrendCard({ category, data, isSelected, onClick }: CategoryTrendCardProps) {
    const current = data[data.length - 1]?.value || 0;
    const previous = data[data.length - 2]?.value || 0;
    const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    const isDown = change <= 0;

    return (
        <button
            onClick={onClick}
            className="text-left p-3 rounded-2xl transition-all duration-200 active:scale-[0.98]"
            style={{
                backgroundColor: isSelected ? `${category.color}15` : "#F5F5F7",
                border: isSelected ? `2px solid ${category.color}` : "2px solid transparent",
                minWidth: "140px",
            }}
        >
            <div className="flex items-center gap-2 mb-2">
                <span className="text-lg [&>svg]:w-5 [&>svg]:h-5">{iconMap[category.icon] || category.icon}</span>
                <span className="text-sm font-medium truncate" style={{ color: "#1D1D1F" }}>{category.name}</span>
            </div>
            <div className="h-10 mb-2">
                <MiniAreaChart data={data} color={category.color} height={40} />
            </div>
            <div className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: "#1D1D1F" }}>${current.toLocaleString()}</span>
                <span className="text-xs font-semibold" style={{ color: isDown ? "#34C759" : "#FF3B30" }}>
                    {isDown ? "↓" : "↑"}{Math.abs(change).toFixed(0)}%
                </span>
            </div>
        </button>
    );
}