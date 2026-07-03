"use client";

import { useState } from "react";
import { Category } from "@/lib/types";
import { PopinWrapper } from "@/components/ui/popin-wrapper";
import { iconMap } from "@/lib/icon-map";

interface ManageCategoriesPopinProps {
    isOpen: boolean;
    onClose: () => void;
    categories: Category[];
    /**
     * Total spending entries per category id, across ALL months — it must
     * match what a cascade delete of the category would destroy.
     */
    entryCounts: Record<string, number>;
    onEditCategory: (category: Category) => void;
    onDeleteCategory: (category: Category) => void;
    onCreateCategory: () => void;
}

/**
 * "Manage Categories" popin: a searchable list of the user's categories with
 * per-row Edit/Delete actions and a full-width New Category CTA. Purely
 * presentational — every mutation goes through the callbacks. Row actions are
 * labeled buttons on ≥sm viewports and icon-only 44px circles on mobile.
 */
export function ManageCategoriesPopin({
    isOpen,
    onClose,
    categories,
    entryCounts,
    onEditCategory,
    onDeleteCategory,
    onCreateCategory,
}: ManageCategoriesPopinProps) {

    const [query, setQuery] = useState("");

    const normalizedQuery = query.trim().toLowerCase();
    const filteredCategories = categories.filter(c => c.label.toLowerCase().includes(normalizedQuery));

    return (
        <PopinWrapper
            isOpen={isOpen}
            onClose={onClose}
            title="Manage Categories"
            subtitle="Edit or remove your spending categories"
            footer={
                <button
                    onClick={onCreateCategory}
                    className="w-full flex items-center justify-center gap-1.5 py-3.5 rounded-2xl text-sm font-semibold border-2 border-dashed transition-all duration-200 active:scale-[0.98]"
                    style={{ borderColor: "#007AFF", backgroundColor: "rgba(0, 122, 255, 0.04)", color: "#007AFF" }}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    New Category
                </button>
            }
        >
            <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
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
                <input
                    type="text"
                    placeholder="Search categories"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: "var(--foreground)" }}
                />

                {query.length > 0 && (
                    <button
                        onClick={() => setQuery("")}
                        aria-label="Clear search"
                        className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-200 active:scale-95"
                        style={{ backgroundColor: "var(--muted-foreground)", color: "var(--card)" }}
                    >
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                )}
            </div>

            <div className="mt-4 flex flex-col gap-2.5">
                {filteredCategories.length === 0 && (
                    <p className="py-8 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
                        {normalizedQuery.length > 0 ? `No categories match "${query.trim()}".` : "No categories found"}
                    </p>
                )}

                {filteredCategories.map((category) => {
                    const count = entryCounts[category.id] ?? 0;

                    return (
                        <div
                            key={category.id}
                            className="flex items-center justify-between gap-3 rounded-2xl p-3"
                            style={{ backgroundColor: "var(--muted)" }}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div
                                    className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center"
                                    style={{ backgroundColor: `${category.color}15`, color: category.color }}
                                >
                                    {iconMap[category.icon] ?? category.icon}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>
                                        {category.label}
                                    </p>
                                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                                        {count} {count === 1 ? "entry" : "entries"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    onClick={() => onEditCategory(category)}
                                    aria-label={`Edit ${category.label}`}
                                    className="flex items-center justify-center gap-1.5 w-11 h-11 rounded-full sm:w-auto sm:h-auto sm:px-3.5 sm:py-2 sm:rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95"
                                    style={{ backgroundColor: "rgba(0, 122, 255, 0.08)", color: "#007AFF" }}
                                >
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                    <span className="hidden sm:inline">Edit</span>
                                </button>
                                <button
                                    onClick={() => onDeleteCategory(category)}
                                    aria-label={`Delete ${category.label}`}
                                    className="flex items-center justify-center gap-1.5 w-11 h-11 rounded-full sm:w-auto sm:h-auto sm:px-3.5 sm:py-2 sm:rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95"
                                    style={{ backgroundColor: "rgba(255, 59, 48, 0.08)", color: "#FF3B30" }}
                                >
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <span className="hidden sm:inline">Delete</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </PopinWrapper>
    );
}
