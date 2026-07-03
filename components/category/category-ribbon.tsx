"use client";

import { CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Settings2 } from "lucide-react";
import { iconMap } from "@/lib/icon-map";

/**
 * Upper desktop pill budget; categories beyond it collapse into the "+N"
 * peek. The effective count shrinks further at render time whenever the row
 * would overflow, so the pills, "+N" and "+ Category" always share one line.
 */
const MAX_VISIBLE_CATEGORIES = 5;

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
    /** Opens Manage Categories from the desktop-only pill pinned right of the pills. */
    onManage: () => void;
}

interface CategoryPillProps {
    category: Category;
    isSelected: boolean;
    onSelect: () => void;
    style?: CSSProperties;
}

/** Selected-aware pill shared by the mobile scroll row, the desktop row and the peek row. */
function CategoryPill({ category, isSelected, onSelect, style }: CategoryPillProps) {
    return (
        <button
            onClick={onSelect}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 active:scale-95"
            style={{
                backgroundColor: isSelected ? category.color : "var(--card)",
                color: isSelected ? "white" : "var(--muted-foreground)",
                border: isSelected ? "none" : "1px solid var(--border)",
                boxShadow: isSelected ? "none" : "0 1px 4px rgba(0,0,0,0.03)",
                ...style,
            }}
        >
            <span>{iconMap[category.icon] ?? category.icon}</span>
            <span className="truncate max-w-[120px]">{category.name}</span>
        </button>
    );
}

function AllPill({ isSelected, onSelect }: { isSelected: boolean; onSelect: () => void }) {
    return (
        <button
            onClick={onSelect}
            className="flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 active:scale-95"
            style={{
                backgroundColor: isSelected ? "var(--foreground)" : "var(--card)",
                color: isSelected ? "var(--background)" : "var(--muted-foreground)",
                border: isSelected ? "none" : "1px solid var(--border)",
                boxShadow: isSelected ? "none" : "0 1px 4px rgba(0,0,0,0.03)",
            }}
        >
            <span>{iconMap["rows"]}</span>
        </button>
    );
}

/** Labeled quick-add pill — same shape as the category pills so create is unmistakable. */
function NewCategoryPill({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            title="New category"
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 active:scale-95"
            style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                color: "#007AFF",
            }}
        >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Category</span>
        </button>
    );
}

export function CategoryRibbon({
    categories,
    selectedCategory,
    onSelect,
    onAddCategory,
    onManage,
}: CategoryRibbonProps) {

    const pillsRegionRef = useRef<HTMLDivElement>(null);
    const [visibleCount, setVisibleCount] = useState(MAX_VISIBLE_CATEGORIES);
    const [measureNonce, setMeasureNonce] = useState(0);
    const [isPeekOpen, setIsPeekOpen] = useState(false);

    // Category add/delete/rename changes pill widths — start the fit search
    // from the full budget again (render-phase reset, per the React
    // "adjusting state when props change" pattern).
    const categorySignature = JSON.stringify(categories.map(c => c.name));
    const [prevSignature, setPrevSignature] = useState(categorySignature);

    if (prevSignature !== categorySignature) {
        setPrevSignature(categorySignature);
        setVisibleCount(MAX_VISIBLE_CATEGORIES);
    }

    // Single-line guarantee: the pills region never wraps, so overflowing
    // pills report scrollWidth > clientWidth; drop one pill and re-measure.
    // useLayoutEffect runs before paint, making the convergence invisible
    // (jsdom reports 0/0 and keeps the budget — measured behavior is covered
    // by the Playwright suite).
    useLayoutEffect(() => {

        const region = pillsRegionRef.current;

        if (region === null) return;

        // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-paint measurement loop, the documented layout-effect pattern; converges before paint
        if (region.scrollWidth > region.clientWidth && visibleCount > 1) setVisibleCount(prev => prev - 1);
    }, [visibleCount, measureNonce, categorySignature, selectedCategory]);

    // Growing back is driven by real size changes (e.g. a window resize):
    // reset to the budget and let the layout effect shrink to fit again. The
    // nonce forces a re-measure even when the count already sits at the
    // budget (e.g. the region narrowed without a prior shrink).
    useEffect(() => {

        const region = pillsRegionRef.current;

        if (region === null) return;

        const observer = new ResizeObserver(() => {
            setVisibleCount(MAX_VISIBLE_CATEGORIES);
            setMeasureNonce(prev => prev + 1);
        });

        observer.observe(region);

        return () => observer.disconnect();
    }, []);

    // Desktop shows at most visibleCount pills. While the peek row is CLOSED
    // and the selected category would be hidden, it is promoted to the front
    // so the active filter stays visible. While the peek row is OPEN the
    // promotion is suspended: selecting a peeked category marks it active in
    // place instead of yanking it (and reshuffling everything) into the top
    // row. "all" is the All-filter sentinel, never a promotion target — a
    // user category legally named "all" must not be pulled forward when the
    // filter is cleared.
    let visibleCategories = categories.slice(0, visibleCount);

    if (!isPeekOpen && selectedCategory !== "all" && visibleCategories.every(c => c.name !== selectedCategory)) {
        const selected = categories.find(c => c.name === selectedCategory);

        if (selected !== undefined) visibleCategories = [selected, ...categories.filter(c => c.name !== selected.name)].slice(0, visibleCount);
    }

    const hiddenCategories = categories.filter(c => visibleCategories.every(v => v.name !== c.name));

    // The peek cannot outlive its overflow: when deletions or a resize bring
    // every category back into the top row there is nothing to peek at, so an
    // open peek resets (render-phase adjustment — the condition is false again
    // right after the set, so this cannot loop).
    if (isPeekOpen && hiddenCategories.length === 0) setIsPeekOpen(false);

    return (
        <div>
            {/* Mobile: every category in one horizontally scrolling row. */}
            <div
                className="sm:hidden flex gap-2 overflow-x-auto pb-1"
                style={{
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    WebkitOverflowScrolling: "touch",
                }}
            >
                <AllPill isSelected={selectedCategory === "all"} onSelect={() => onSelect("all")} />

                {categories.map((cat) => (
                    <CategoryPill
                        key={cat.name}
                        category={cat}
                        isSelected={selectedCategory === cat.name}
                        onSelect={() => onSelect(cat.name)}
                    />
                ))}

                <NewCategoryPill onClick={onAddCategory} />
            </div>

            {/* Desktop: a single-line row. The pills region takes the free
                space, so "+N", "+ Category" and Manage sit pinned at the right
                edge in a fixed position regardless of label widths. */}
            <div className="hidden sm:block">
                <div className="flex flex-nowrap items-center gap-2 pb-1">
                    <div ref={pillsRegionRef} className="flex-1 min-w-0 flex flex-nowrap items-center gap-2 overflow-hidden">
                        <AllPill isSelected={selectedCategory === "all"} onSelect={() => onSelect("all")} />

                        {visibleCategories.map((cat) => (
                            <CategoryPill
                                key={cat.name}
                                category={cat}
                                isSelected={selectedCategory === cat.name}
                                onSelect={() => onSelect(cat.name)}
                            />
                        ))}
                    </div>

                    {hiddenCategories.length > 0 && (
                        <button
                            onClick={() => setIsPeekOpen(prev => !prev)}
                            title="Show more categories"
                            aria-expanded={isPeekOpen}
                            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 active:scale-95"
                            style={{
                                backgroundColor: isPeekOpen ? "rgba(0, 122, 255, 0.08)" : "var(--card)",
                                color: isPeekOpen ? "#007AFF" : "var(--foreground)",
                                border: isPeekOpen ? "1px solid #007AFF" : "1px solid var(--border)",
                            }}
                        >
                            +{hiddenCategories.length}
                            <svg
                                className="w-3.5 h-3.5"
                                style={{ transform: isPeekOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>
                    )}

                    <NewCategoryPill onClick={onAddCategory} />

                    {/* Manage categories (desktop only; mobile uses the Spending header button) */}
                    <button
                        onClick={onManage}
                        className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 active:scale-95 bg-muted text-foreground"
                    >
                        <Settings2 className="w-4 h-4" strokeWidth={1.9} />
                        Manage
                    </button>
                </div>

                {/* Second row: the hidden categories expand in place under a
                    dashed separator; selecting one marks it active right there. */}
                {isPeekOpen && hiddenCategories.length > 0 && (
                    <div
                        className="flex flex-wrap items-center gap-2 mt-2 pt-3 border-t border-dashed"
                        style={{ borderColor: "var(--border)" }}
                    >
                        {hiddenCategories.map((cat, index) => (
                            <CategoryPill
                                key={cat.name}
                                category={cat}
                                isSelected={selectedCategory === cat.name}
                                onSelect={() => onSelect(cat.name)}
                                style={{
                                    animation: "categoryRibbonPeekIn 0.3s both",
                                    animationDelay: `${index * 30}ms`,
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Hide the mobile row's scrollbar */}
            <style jsx>{`
                div::-webkit-scrollbar {
                    display: none;
                }
            `}</style>

            {/* Global: inline animation styles can't reference styled-jsx-scoped keyframes. */}
            <style jsx global>{`
                @keyframes categoryRibbonPeekIn {
                    from {
                        opacity: 0;
                        transform: translateY(-8px) scale(0.94);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            `}</style>
        </div>
    );
}
