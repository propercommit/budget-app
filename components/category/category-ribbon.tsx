"use client";

import { CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Settings2 } from "lucide-react";
import { iconMap } from "@/lib/icon-map";

/**
 * Upper desktop pill budget; categories beyond it collapse into the "+N"
 * peek. The effective count shrinks further at render time whenever the row
 * would overflow, so the pills, "+N" and "New" always share one line.
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

/** Selected-aware pill shared by the mobile scroll row, the desktop row and the peek. */
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

function NewCategoryPill({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
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
    );
}

interface OverflowPeekProps {
    hiddenCategories: Category[];
    selectedCategory: string;
    onSelect: (category: string) => void;
}

/**
 * The "+N" pill and its hover flyout of hidden categories. Owns its own open
 * state so it dies with the component: the ribbon only mounts this while an
 * overflow exists, which makes a stale pre-opened peek impossible.
 */
function OverflowPeek({ hiddenCategories, selectedCategory, onSelect }: OverflowPeekProps) {

    const [isPeekOpen, setIsPeekOpen] = useState(false);

    // Pure selection: picking a peeked category closes the peek, and the
    // ribbon's promotion rule pulls it into the visible row.
    const handleSelect = (name: string) => {
        setIsPeekOpen(false);
        onSelect(name);
    };

    return (
        <div
            className="relative flex-shrink-0"
            onMouseEnter={() => setIsPeekOpen(true)}
            onMouseLeave={() => setIsPeekOpen(false)}
        >
            {/* Open-only click: a tap/click is always preceded by the
                wrapper's mouseenter, so a toggle would close what the hover
                just opened. Mouse-leave (or selecting) closes. */}
            <button
                onClick={() => setIsPeekOpen(true)}
                title="Show more categories"
                aria-expanded={isPeekOpen}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 active:scale-95"
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

            {/* pt-2 bridges the gap so the hover survives the travel down. */}
            {isPeekOpen && (
                <div className="absolute top-full left-0 z-20 pt-2">
                    <div className="flex flex-col items-start gap-2">
                        {hiddenCategories.map((cat, index) => (
                            <CategoryPill
                                key={cat.name}
                                category={cat}
                                isSelected={selectedCategory === cat.name}
                                onSelect={() => handleSelect(cat.name)}
                                style={{
                                    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.14)",
                                    animation: "categoryRibbonPeekIn 0.3s both",
                                    animationDelay: `${index * 35}ms`,
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
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

    // Desktop shows at most visibleCount pills; when the selected category
    // would be hidden, it is promoted to the front of the row so the active
    // filter always stays visible. "all" is the All-filter sentinel, never a
    // promotion target — a user category legally named "all" must not be
    // yanked forward when the filter is cleared.
    let visibleCategories = categories.slice(0, visibleCount);

    if (selectedCategory !== "all" && visibleCategories.every(c => c.name !== selectedCategory)) {
        const selected = categories.find(c => c.name === selectedCategory);

        if (selected !== undefined) visibleCategories = [selected, ...categories.filter(c => c.name !== selected.name)].slice(0, visibleCount);
    }

    const hiddenCategories = categories.filter(c => visibleCategories.every(v => v.name !== c.name));

    return (
        <div className="relative flex items-start gap-2">
            {/* Mobile: every category in one horizontally scrolling row. */}
            <div
                className="sm:hidden flex-1 min-w-0 flex gap-2 overflow-x-auto pb-1"
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
                space, so "+N" and "New" sit pinned at the right edge (next to
                Manage) in a fixed position regardless of label widths. */}
            <div className="hidden sm:flex flex-1 min-w-0 flex-nowrap items-center gap-2 pb-1">
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
                    <OverflowPeek
                        hiddenCategories={hiddenCategories}
                        selectedCategory={selectedCategory}
                        onSelect={onSelect}
                    />
                )}

                <NewCategoryPill onClick={onAddCategory} />
            </div>

            {/* Manage categories (desktop only; mobile uses the Spending header button) */}
            <button
                onClick={onManage}
                className="hidden sm:flex flex-shrink-0 items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 active:scale-95 bg-muted text-foreground"
            >
                <Settings2 className="w-4 h-4" strokeWidth={1.9} />
                Manage
            </button>

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
