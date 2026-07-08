"use client";

import { useRef, useState, useEffect, useCallback, ReactNode, forwardRef, useImperativeHandle } from "react";

interface SpendingCarouselProps {
    itemCount: number;
    onAdd: () => void;
    children: ReactNode;
}

export interface SpendingCarouselRef {
    scrollToIndex: (index: number) => void;
}

export const SpendingCarousel = forwardRef<SpendingCarouselRef, SpendingCarouselProps>(
    function SpendingCarousel({ itemCount, onAdd, children }, ref) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const safeIndex = Math.min(activeIndex, Math.max(0, itemCount - 1));
    const [containerHeight, setContainerHeight] = useState<number | undefined>(undefined);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isScrollingRef = useRef(false);

    const updateHeight = useCallback((index: number) => {
        if (!scrollRef.current) return;
        const child = scrollRef.current.children[index] as HTMLElement;
        if (child) {
            setContainerHeight(child.scrollHeight);
        }
    }, []);

    const handleScroll = useCallback(() => {
        if (!scrollRef.current) return;
        const container = scrollRef.current;
        const cardWidth = container.offsetWidth;
        const newIndex = Math.round(container.scrollLeft / cardWidth);
        const clamped = Math.max(0, Math.min(newIndex, itemCount - 1));
        setActiveIndex(clamped);

        isScrollingRef.current = true;
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
            isScrollingRef.current = false;
            updateHeight(clamped);
        }, 150);
    }, [itemCount, updateHeight]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener("scroll", handleScroll, { passive: true });
        return () => el.removeEventListener("scroll", handleScroll);
    }, [handleScroll]);

    const scrollToIndex = (index: number) => {
        if (!scrollRef.current) return;
        const cardWidth = scrollRef.current.offsetWidth;
        scrollRef.current.scrollTo({ left: index * cardWidth, behavior: "smooth" });
        setActiveIndex(index);
    };

    useEffect(() => {
        if (!scrollRef.current) return;
        const activeChild = scrollRef.current.children[safeIndex] as HTMLElement;
        if (!activeChild) return;

        const onResize = () => {
            if (!isScrollingRef.current) {
                setContainerHeight(activeChild.scrollHeight);
            }
        };

        onResize();

        const observer = new ResizeObserver(onResize);
        observer.observe(activeChild);

        return () => observer.disconnect();
    }, [safeIndex]);

    useImperativeHandle(ref, () => ({
        scrollToIndex,
    }));

    if (itemCount === 0) {
        return (
            <div className="py-8 text-center">
                <button
                    onClick={onAdd}
                    className="mx-auto w-14 h-14 mb-3 rounded-2xl flex items-center justify-center bg-primary hover:bg-primary-hover shadow-[var(--shadow-btn-primary)] transition-all duration-200 active:scale-95"
                >
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
                <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>No spending items</p>
                <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>Add a spending item to get started</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
        <div
            ref={scrollRef}
            className="flex items-start overflow-x-auto overflow-y-hidden snap-x snap-mandatory"
            style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
                height: containerHeight ? `${containerHeight}px` : "auto",
                transition: "height 500ms cubic-bezier(0.25, 1, 0.5, 1)",
            }}
        >
                {children}

                <style jsx>{`
                    div::-webkit-scrollbar {
                        display: none;
                    }
                `}</style>
            </div>

            {itemCount > 1 && (
                <div className="flex items-center justify-center gap-1.5">
                    {Array.from({ length: itemCount }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => scrollToIndex(i)}
                            className="transition-all duration-300 rounded-full"
                            style={{
                                width: i === safeIndex ? 20 : 6,
                                height: 6,
                                backgroundColor: i === safeIndex ? "var(--foreground)" : "var(--border)",
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
);