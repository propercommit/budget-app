"use client";

import { Pencil } from "lucide-react";
import { iconMap } from "@/lib/icon-map";
import { useState } from "react";
import { useSettings } from "@/lib/settings-context";
import { spentDisplay } from "@/lib/spending/format-spent";
import { ExpandToggleButton } from "../ui/expand-toggle-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

export interface SpendingEntry {
    id: string;
    name: string;
    date: string;
    amount: number; // integer cents, always a positive magnitude
    direction: "debit" | "credit"; // sign of the entry's effect on spent
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
    /** Receives the clicked entry plus the list as currently displayed (filtered + sorted), for sibling paging in the detail popin. */
    onEntryClick: (entry: SpendingEntry, visibleEntries: SpendingEntry[]) => void;
    onAddEntry: () => void;
    onItemDetailClick: () => void;
    onItemEditClick: () => void;
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
    onItemEditClick,
}: SpendingCardExpandedProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");

    const amountLeft = budgetNumber - totalSpent;
    const isOverBudget = amountLeft < 0;
    const spentPercent = budgetNumber > 0 ? Math.round((totalSpent / budgetNumber) * 100) : 0;
    // Status color shared by the progress bar and the remaining pill: red once
    // over budget, orange from 85% of budget, green below.
    const isNearBudget = !isOverBudget && budgetNumber > 0 && totalSpent / budgetNumber >= 0.85;
    const statusColor = isOverBudget ? "#FF3B30" : isNearBudget ? "#FF9500" : "#34C759";
    const { formatAmount, formatDateShort } = useSettings();
    const spent = spentDisplay(totalSpent, formatAmount);

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
            className="bg-card border border-(--card-border) rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)]"
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
                            <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
                                {spendingName}
                            </h2>
                            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                                {categoryName}
                            </p>
                        </div>
                    </button>

                    {/* Right — Spent/Budget + Chevron */}
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-lg font-bold tabular-nums" style={{ color: spent.color }}>
                                {spent.label}
                            </p>
                            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                                of {formatAmount(budgetNumber)}
                            </p>
                        </div>
                        {/* Action pill — edit + expand. The pencil only fits from sm: up;
                            at carousel width it would crush the item name (edit stays
                            reachable on mobile via the detail popin). */}
                        <div className="flex items-stretch rounded-full overflow-hidden flex-shrink-0 bg-muted">
                            <button
                                aria-label="Edit spending item"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onItemEditClick();
                                }}
                                className="w-10 h-10 hidden sm:flex items-center justify-center hover:bg-input transition-colors touch-manipulation"
                            >
                                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            <div className="w-px my-2.5 hidden sm:block bg-border" />
                            <ExpandToggleButton
                                isExpanded={true}
                                onToggle={onCollapse}
                                className="w-10 h-10 rounded-none bg-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Row 2: Progress Bar */}
                <div
                    className="w-full h-3 rounded-full overflow-hidden bg-input"
                >
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            // Two-sided clamp: a net-credit month has negative spent, and a
                            // negative width is invalid CSS (dropped → full-width bar).
                            width: `${Math.min(100, Math.max(0, spentPercent))}%`,
                            backgroundColor: statusColor,
                        }}
                    />
                </div>

                {/* Row 3: Status */}
                <div className="flex items-center justify-between mt-3">
                    <div
                        className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{
                            // 10%-alpha tint of the status color, hex-suffix style as the icon tile.
                            backgroundColor: `${statusColor}1A`,
                            color: statusColor,
                        }}
                    >
                        {isOverBudget
                            ? `${formatAmount(Math.abs(amountLeft))} over`
                            : `${formatAmount(amountLeft)} left`}
                    </div>
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {spendingEntries} {spendingEntries === 1 ? "entry" : "entries"}
                    </span>
                </div>
            </div>

            {/* Expanded Content — Entries */}
            <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                <div className="h-px mb-4 bg-border" />

                {/* Search and Sort */}
                <div className="flex gap-2 mb-3">
                    <div
                        className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 rounded-xl"
                        style={{ backgroundColor: "var(--muted)" }}
                    >
                        <svg
                            className="w-4 h-4 flex-shrink-0"
                            style={{ color: "var(--muted-foreground)" }}
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
                        {/* text-base on mobile: iOS auto-zooms into inputs
                            whose font is under 16px (see manage popin). */}
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent outline-none text-base sm:text-sm"
                            style={{ color: "var(--foreground)" }}
                        />
                    </div>
                    <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as typeof sortOrder)}>
                        <SelectTrigger className="flex-shrink-0 h-auto px-3 py-2.5 rounded-xl text-xs font-medium border-none bg-muted text-foreground">
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

                {/* Entry List — plain rows; click still opens the entry detail popin */}
                <div className="max-h-64 overflow-y-auto">
                    {filteredEntries.map((entry) => (
                        <button
                            key={entry.id}
                            onClick={() => onEntryClick(entry, filteredEntries)}
                            className="w-full flex items-center justify-between py-2 px-0.5 rounded-lg cursor-pointer transition-colors hover:bg-muted text-left"
                        >
                            <div className="flex flex-col gap-px">
                                <p className="font-medium text-[13px]" style={{ color: "var(--foreground)" }}>
                                    {entry.name}
                                </p>
                                <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                                    {formatDateShort(entry.date)}
                                </p>
                            </div>
                            <p className="font-semibold text-[13px] tabular-nums whitespace-nowrap flex-shrink-0" style={{ color: entry.direction === "credit" ? "#34C759" : "var(--foreground)" }}>
                                {entry.direction === "credit" ? "+" : "-"}
                                {formatAmount(entry.amount)}
                            </p>
                        </button>
                    ))}

                    {/* Empty State */}
                    {filteredEntries.length === 0 && (
                        <div className="text-center py-8">
                            <div
                                className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: "var(--muted)" }}
                            >
                                <svg
                                    className="w-6 h-6"
                                    style={{ color: "var(--muted-foreground)" }}
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
                            <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                                No entries yet
                            </p>
                            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                                Add your first expense
                            </p>
                        </div>
                    )}
                </div>

                {/* Add Entry Button */}
                <button
                    onClick={onAddEntry}
                    className="w-full mt-3 p-3.5 rounded-xl border-2 border-dashed transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] hover:border-[#007AFF] hover:bg-[rgba(0,122,255,0.05)]"
                    style={{ borderColor: "var(--border)" }}
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