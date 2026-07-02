"use client";

import { Settings2 } from "lucide-react";
import { iconMap } from "@/lib/icon-map";

interface Category {
    name: string;
    icon: string;
    color: string;
}

interface CategoryRibbonProps {
    categories: Category[];
    selectedCategory: string;
    onSelect: (category: string) => void;
    onAddCategory: () => void;
    /** When provided, renders a desktop-only "Manage" pill pinned right of the scrolling pills. */
    onManage?: () => void;
}

export function CategoryRibbon({
    categories,
    selectedCategory,
    onSelect,
    onAddCategory,
    onManage,
}: CategoryRibbonProps) {
    return (
        <div className="relative flex items-start gap-2">
            <div
                className="flex-1 min-w-0 flex gap-2 overflow-x-auto pb-1"
                style={{
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    WebkitOverflowScrolling: "touch",
                }}
            >
                {/* All button */}
                <button
                    onClick={() => onSelect("all")}
                    className="flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 active:scale-95"
                    style={{
                        backgroundColor: selectedCategory === "all" ? "#1D1D1F" : "#FFFFFF",
                        color: selectedCategory === "all" ? "white" : "#6E6E73",
                        border: selectedCategory === "all" ? "none" : "1px solid #E5E5EA",
                        boxShadow: selectedCategory === "all" ? "none" : "0 1px 4px rgba(0,0,0,0.03)",
                    }}
                >
                    <span>{iconMap["rows"]}</span>
                </button>

                {/* Category pills */}
                {categories.map((cat) => (
                    <button
                        key={cat.name}
                        onClick={() => onSelect(cat.name)}
                        className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 active:scale-95"
                        style={{
                            backgroundColor: selectedCategory === cat.name ? cat.color : "#FFFFFF",
                            color: selectedCategory === cat.name ? "white" : "#6E6E73",
                            border: selectedCategory === cat.name ? "none" : "1px solid #E5E5EA",
                            boxShadow: selectedCategory === cat.name ? "none" : "0 1px 4px rgba(0,0,0,0.03)",
                        }}
                    >
                        <span>{iconMap[cat.icon] || cat.icon}</span>
                        <span className="truncate max-w-[120px]">{cat.name}</span>
                    </button>
                ))}

                {/* Add category button */}
                <button
                    onClick={onAddCategory}
                    className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 border-2 border-dashed"
                    style={{
                        borderColor: "#007AFF",
                        backgroundColor: "rgba(0, 122, 255, 0.04)",
                        color: "#007AFF",
                    }}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>New</span>
                </button>
            </div>

            {/* Manage categories (desktop only; mobile uses the Spending header button) */}
            {onManage !== undefined && (
                <button
                    onClick={onManage}
                    className="hidden sm:flex flex-shrink-0 items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 active:scale-95"
                    style={{ backgroundColor: "#F5F5F7", color: "#1D1D1F" }}
                >
                    <Settings2 className="w-4 h-4" strokeWidth={1.9} />
                    Manage
                </button>
            )}

            {/* Hide scrollbar */}
            <style jsx>{`
                div::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}