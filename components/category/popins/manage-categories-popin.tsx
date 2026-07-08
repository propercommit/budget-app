"use client";

import { useState } from "react";
import { Plus, X, SearchX, LayoutGrid } from "lucide-react";
import { Category } from "@/lib/types";
import { PopinWrapper } from "@/components/ui/popin-wrapper";
import { Button } from "@/components/ui/button";
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
 * presentational — every mutation goes through the callbacks.
 *
 * Layout (via PopinWrapper): centered modal on desktop, bottom sheet on
 * mobile. Rows are elevated cards that raise on hover; the Edit/Delete row
 * actions are icon-only circular buttons on every viewport (44px on mobile,
 * 40px on desktop), tinting blue/red on hover.
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

    const trimmedQuery = query.trim();
    const normalizedQuery = trimmedQuery.toLowerCase();
    const filteredCategories = categories.filter(c => c.label.toLowerCase().includes(normalizedQuery));

    const hasQuery = query.length > 0;
    const isEmpty = filteredCategories.length === 0;
    const isSearching = trimmedQuery.length > 0;

    const countLabel = hasQuery
        ? `${filteredCategories.length} ${filteredCategories.length === 1 ? "result" : "results"}`
        : `${categories.length} ${categories.length === 1 ? "category" : "categories"}`;

    return (
        <PopinWrapper
            isOpen={isOpen}
            onClose={onClose}
            title="Manage Categories"
            subtitle="Edit or remove your spending categories"
            footer={
                <Button size="lg" className="w-full text-[15px]" onClick={onCreateCategory}>
                    <Plus className="w-[18px] h-[18px]" strokeWidth={2.5} />
                    New Category
                </Button>
            }
        >
            <div
                className="flex items-center gap-2.5 px-3 py-[11px] rounded-[13px] border border-transparent transition-all duration-150 focus-within:border-primary focus-within:shadow-[var(--shadow-focus-ring)]"
                style={{ backgroundColor: "var(--muted)" }}
            >
                <svg
                    className="w-[17px] h-[17px] flex-shrink-0"
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
                {/* text-base on mobile: iOS auto-zooms into inputs whose font
                    is under 16px, yanking the whole view around on focus. */}
                <input
                    type="text"
                    placeholder="Search categories"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent outline-none border-none text-base"
                    style={{ color: "var(--foreground)" }}
                />

                {hasQuery && (
                    <button
                        onClick={() => setQuery("")}
                        aria-label="Clear search"
                        className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-200 active:scale-95"
                        style={{ backgroundColor: "var(--muted-foreground)", color: "var(--card)" }}
                    >
                        <X className="w-2.5 h-2.5" strokeWidth={3} />
                    </button>
                )}
            </div>

            {!isEmpty && (
                <p
                    className="mt-4 mb-2 px-0.5 text-[12px] font-semibold tracking-[0.02em] uppercase"
                    style={{ color: "var(--muted-foreground)" }}
                >
                    {countLabel}
                </p>
            )}

            {isEmpty ? (
                <div className="flex flex-col items-center text-center px-6 pt-11 pb-9">
                    <div
                        className="w-[60px] h-[60px] rounded-full flex items-center justify-center mb-4"
                        style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
                    >
                        {isSearching ? <SearchX className="w-[26px] h-[26px]" /> : <LayoutGrid className="w-[26px] h-[26px]" />}
                    </div>
                    <p className="text-[15px] font-semibold mb-1" style={{ color: "var(--foreground)" }}>
                        {isSearching ? "No matches" : "No categories yet"}
                    </p>
                    <p className="text-[13.5px] leading-[1.45] max-w-[240px]" style={{ color: "var(--muted-foreground)" }}>
                        {isSearching
                            ? `Nothing matches “${trimmedQuery}”. Try a different search.`
                            : "Create your first category to start organizing your spending."}
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {filteredCategories.map((category) => {
                        const count = entryCounts[category.id] ?? 0;

                        return (
                            <div
                                key={category.id}
                                className="flex items-center justify-between gap-2.5 rounded-2xl p-2.5 pl-3 border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_4px_14px_rgba(0,0,0,0.07)] hover:border-black/[0.09]"
                                style={{ backgroundColor: "var(--card)" }}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div
                                        className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
                                        style={{ backgroundColor: `${category.color}14`, color: category.color }}
                                    >
                                        {iconMap[category.icon] ?? category.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[15px] font-semibold tracking-[-0.01em] truncate" style={{ color: "var(--foreground)" }}>
                                            {category.label}
                                        </p>
                                        <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
                                            {count} {count === 1 ? "entry" : "entries"}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-0.5 flex-shrink-0">
                                    <button
                                        onClick={() => onEditCategory(category)}
                                        aria-label={`Edit ${category.label}`}
                                        className="flex items-center justify-center w-11 h-11 sm:w-10 sm:h-10 rounded-full transition-colors duration-150 active:scale-95 text-[color:var(--muted-foreground)] hover:bg-primary/10 hover:text-primary"
                                    >
                                        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => onDeleteCategory(category)}
                                        aria-label={`Delete ${category.label}`}
                                        className="flex items-center justify-center w-11 h-11 sm:w-10 sm:h-10 rounded-full transition-colors duration-150 active:scale-95 text-[color:var(--muted-foreground)] hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </PopinWrapper>
    );
}
