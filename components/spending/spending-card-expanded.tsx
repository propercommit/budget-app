"use client";

import { iconMap } from "@/lib/icon-map";
import { useState } from "react";
import { useSettings } from "@/lib/settings-context";
import { ExpandToggleButton } from "../ui/expand-toggle-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

export interface SpendingEntry {
    id: string;
    name: string;
    date: string;
    amount: number;
    receipt?: string | null;
    link?: string | null;
}

interface SpendingCardExpandedProps {
    spendingName: string;
    categoryName: string;
    budgetNumber: number;
    totalSpent: number;
    spendingEntries: number;
    spendingItemIcon: string;
    spendingCategoryColor: string;
    entries: SpendingEntry[];
    onCollapse: () => void;
    onEntryClick: (entry: SpendingEntry) => void;
    onAddEntry: () => void;
    onItemDetailClick: () => void;
}

export function SpendingCardExpanded({
    spendingName,
    categoryName,
    budgetNumber,
    totalSpent,
    spendingEntries,
    spendingItemIcon,
    spendingCategoryColor,
    entries,
    onCollapse,
    onEntryClick,
    onAddEntry,
    onItemDetailClick,
}: SpendingCardExpandedProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");

    const amountLeft = budgetNumber - totalSpent;
    const isOverBudget = amountLeft < 0;
    const spentPercent = budgetNumber > 0 ? Math.round((totalSpent / budgetNumber) * 100) : 0;
    const { formatAmount, formatDateShort } = useSettings();

    const filteredEntries = entries
        .filter((entry) => entry.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            if (sortOrder === "newest") return new Date(b.date).getTime() - new Date(a.date).getTime();
            if (sortOrder === "oldest") return new Date(a.date).getTime() - new Date(b.date).getTime();
            if (sortOrder === "highest") return b.amount - a.amount;
            if (sortOrder === "lowest") return a.amount - b.amount;
            return 0;
        });

    return (
        <div
            className="bg-white rounded-3xl overflow-hidden"
            style={{
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)",
                border: "1px solid rgba(0, 0, 0, 0.04)",
            }}
        >
            {/* Header section — same as collapsed */}
            <div className="p-4 sm:p-5">
                {/* Row 1: Header */}
                <div className="flex items-center justify-between mb-3">
                    {/* Left — Icon + Name/Category (clickable for detail popin) */}
                    <button
                        className="flex items-center gap-3 transition-all duration-200 active:scale-[0.98]"
                        onClick={onItemDetailClick}
                    >
                        <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                            style={{ backgroundColor: `${spendingCategoryColor}15` }}
                        >
                            {iconMap[spendingItemIcon] || spendingItemIcon}
                        </div>
                        <div className="text-left">
                            <h2 className="text-base font-semibold" style={{ color: "#1D1D1F" }}>
                                {spendingName}
                            </h2>
                            <p className="text-xs" style={{ color: "#6E6E73" }}>
                                {categoryName}
                            </p>
                        </div>
                    </button>

                    {/* Right — Spent/Budget + Chevron */}
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-lg font-bold tabular-nums" style={{ color: "#1D1D1F" }}>
                                {formatAmount(totalSpent)}
                            </p>
                            <p className="text-xs" style={{ color: "#6E6E73" }}>
                                of {formatAmount(budgetNumber)}
                            </p>
                        </div>
                        <ExpandToggleButton
                            isExpanded={true}
                            onToggle={onCollapse}
                        />
                    </div>
                </div>

                {/* Row 2: Progress Bar */}
                <div
                    className="w-full h-3 rounded-full overflow-hidden"
                    style={{ backgroundColor: "#E5E5EA" }}
                >
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${Math.min(spentPercent, 100)}%`,
                            backgroundColor: isOverBudget
                                ? "#FF3B30"
                                : spentPercent > 80
                                    ? "#FF9500"
                                    : "#34C759",
                        }}
                    />
                </div>

                {/* Row 3: Status */}
                <div className="flex items-center justify-between mt-3">
                    <div
                        className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{
                            backgroundColor: isOverBudget
                                ? "rgba(255, 59, 48, 0.1)"
                                : "rgba(52, 199, 89, 0.1)",
                            color: isOverBudget ? "#FF3B30" : "#34C759",
                        }}
                    >
                        {isOverBudget
                            ? `$${Math.abs(amountLeft).toLocaleString()} over`
                            : `$${amountLeft.toLocaleString()} left`}
                    </div>
                    <span className="text-xs" style={{ color: "#6E6E73" }}>
                        {spendingEntries} {spendingEntries === 1 ? "entry" : "entries"}
                    </span>
                </div>
            </div>

            {/* Expanded Content — Entries */}
            <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                <div className="h-px mb-4" style={{ backgroundColor: "#E5E5EA" }} />

                {/* Search and Sort */}
                <div className="flex gap-2 mb-3">
                    <div
                        className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 rounded-xl"
                        style={{ backgroundColor: "#F5F5F7" }}
                    >
                        <svg
                            className="w-4 h-4 flex-shrink-0"
                            style={{ color: "#6E6E73" }}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent outline-none text-sm"
                            style={{ color: "#1D1D1F" }}
                        />
                    </div>
                    <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as typeof sortOrder)}>
                        <SelectTrigger className="flex-shrink-0 h-auto px-3 py-2.5 rounded-xl text-xs font-medium border-none bg-[#F5F5F7] text-[#1D1D1F]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest</SelectItem>
                            <SelectItem value="oldest">Oldest</SelectItem>
                            <SelectItem value="highest">Highest</SelectItem>
                            <SelectItem value="lowest">Lowest</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Entry List */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredEntries.map((entry) => (
                        <button
                            key={entry.id}
                            onClick={() => onEntryClick(entry)}
                            className="w-full flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors hover:bg-gray-100 text-left"
                            style={{ backgroundColor: "#F5F5F7" }}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-9 h-9 rounded-lg flex items-center justify-center text-base"
                                    style={{ backgroundColor: `${spendingCategoryColor}20` }}
                                >
                                    {iconMap[spendingItemIcon] || spendingItemIcon}
                                </div>
                                <div>
                                    <p className="font-medium text-sm" style={{ color: "#1D1D1F" }}>
                                        {entry.name}
                                    </p>
                                    <p className="text-xs truncate max-w-[160px]" style={{ color: "#6E6E73" }}>
                                        {formatDateShort(entry.date)}
                                    </p>
                                </div>
                            </div>
                            <p className="font-semibold text-sm tabular-nums whitespace-nowrap flex-shrink-0" style={{ color: "#1D1D1F" }}>
                                -{formatAmount(entry.amount)}
                            </p>
                        </button>
                    ))}

                    {/* Empty State */}
                    {filteredEntries.length === 0 && (
                        <div className="text-center py-8">
                            <div
                                className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: "#F5F5F7" }}
                            >
                                <svg
                                    className="w-6 h-6"
                                    style={{ color: "#6E6E73" }}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                            </div>
                            <p className="text-sm font-medium" style={{ color: "#1D1D1F" }}>
                                No entries yet
                            </p>
                            <p className="text-xs mt-1" style={{ color: "#6E6E73" }}>
                                Add your first expense
                            </p>
                        </div>
                    )}
                </div>

                {/* Add Entry Button */}
                <button
                    onClick={onAddEntry}
                    className="w-full mt-3 p-3.5 rounded-xl border-2 border-dashed transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] hover:border-[#007AFF] hover:bg-[rgba(0,122,255,0.05)]"
                    style={{ borderColor: "#E5E5EA" }}
                >
                    <svg
                        className="w-5 h-5"
                        style={{ color: "#007AFF" }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                        />
                    </svg>
                    <span className="font-medium text-sm" style={{ color: "#007AFF" }}>
                        Add Entry
                    </span>
                </button>
            </div>
        </div>
    );
}