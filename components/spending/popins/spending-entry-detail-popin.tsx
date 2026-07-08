"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { SpendingEntry } from "../spending-card-expanded";
import { PopinWrapper } from "@/components/ui/popin-wrapper";
import { Button } from "@/components/ui/button";
import { iconMap } from "@/lib/icon-map";
import { useSettings } from "@/lib/settings-context";
import { ReceiptViewer } from "@/components/ui/receipt-viewer";

/** Minimum horizontal travel (px) before a touch counts as a page swipe. */
const SWIPE_THRESHOLD = 48;

interface EntryDetailPopinProps {
    isOpen: boolean;
    onClose: () => void;
    onEdit: () => void;
    entry: SpendingEntry | null;
    /**
     * Sibling entries of the same spending item, in the order the list
     * currently displays them. With 2+ entries the popin becomes a pager:
     * swipe horizontally (mobile), left/right arrow keys (desktop).
     */
    entries?: SpendingEntry[];
    /** Receives the sibling to display when the user pages. */
    onNavigate?: (entry: SpendingEntry) => void;
    spendingName: string;
    spendingItemIcon: string;
    spendingCategoryColor: string;
}

export function EntryDetailPopin(props: EntryDetailPopinProps) {
    const { isOpen, onClose, onEdit, entry, entries = [], onNavigate, spendingName, spendingItemIcon, spendingCategoryColor } = props;
    const { formatDateFull, formatAmount } = useSettings();
    const [isReceiptViewerOpen, setIsReceiptViewerOpen] = useState(false);

    // Where the current touch began — a ref, since it never affects rendering.
    const touchStart = useRef<{ x: number; y: number } | null>(null);

    const index = entry === null ? -1 : entries.findIndex(e => e.id === entry.id);
    const canNavigate = onNavigate !== undefined && index >= 0 && entries.length > 1;
    const prevEntry = canNavigate && index > 0 ? entries[index - 1] : null;
    const nextEntry = canNavigate && index < entries.length - 1 ? entries[index + 1] : null;

    // Side the incoming entry slides in from, derived from the index delta of
    // a page turn while open (render-phase adjustment, per the React
    // "adjusting state when props change" pattern). null — the initial open,
    // or a reopen — renders without animation, and every navigation path
    // (keys, swipe, future buttons) gets the animation for free.
    const currentKey = isOpen && entry !== null ? entry.id : null;
    const [prevKey, setPrevKey] = useState(currentKey);
    const [slideFrom, setSlideFrom] = useState<"left" | "right" | null>(null);

    if (prevKey !== currentKey) {
        setPrevKey(currentKey);

        const oldIndex = prevKey === null ? -1 : entries.findIndex(e => e.id === prevKey);

        if (oldIndex >= 0 && index >= 0 && currentKey !== null) setSlideFrom(index > oldIndex ? "right" : "left");
        else setSlideFrom(null);
    }

    // Desktop keyboard pager. Inert while the receipt viewer covers the popin.
    useEffect(() => {
        if (!isOpen || onNavigate === undefined || isReceiptViewerOpen) return;

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft" && prevEntry !== null) onNavigate(prevEntry);

            if (e.key === "ArrowRight" && nextEntry !== null) onNavigate(nextEntry);
        };

        window.addEventListener("keydown", handleKey);

        return () => window.removeEventListener("keydown", handleKey);
    }, [isOpen, isReceiptViewerOpen, prevEntry, nextEntry, onNavigate]);

    if (entry === null) return null;

    const entryLink = entry.link || null;
    const entryReceipt = entry.receipt || null;

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    // A swipe pages only when clearly horizontal, so vertical scrolling of the
    // popin content keeps working untouched.
    const handleTouchEnd = (e: React.TouchEvent) => {

        if (touchStart.current === null) return;

        const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
        const deltaY = e.changedTouches[0].clientY - touchStart.current.y;

        touchStart.current = null;

        if (onNavigate === undefined || Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) < Math.abs(deltaY)) return;

        if (deltaX < 0 && nextEntry !== null) onNavigate(nextEntry);

        if (deltaX > 0 && prevEntry !== null) onNavigate(prevEntry);
    };

    // touch-pan-y: horizontal pans are the pager's, and must not turn into a
    // native scroll of the carousel behind the popin (iOS scroll
    // bleed-through); vertical panning still scrolls the sheet content. The
    // slide-in classes replay on the sheetKey remount per page turn.
    const sheetClassName = `touch-pan-y ${slideFrom === null ? "" : `animate-in fade-in duration-300 ${slideFrom === "right" ? "slide-in-from-right-7" : "slide-in-from-left-7"}`}`;

    return (
        <PopinWrapper
            isOpen={isOpen}
            onClose={onClose}
            title="Entry Details"
            subtitle={canNavigate ? `Entry ${index + 1} of ${entries.length}` : undefined}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            sheetKey={entry.id}
            sheetClassName={sheetClassName}
            headerActions={
                <button
                    onClick={onEdit}
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95"
                    style={{ backgroundColor: "var(--muted)" }}
                >
                    <svg className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </button>
            }
            footer={
                <Button variant="secondary" className="w-full" onClick={onClose}>
                    Close
                </Button>
            }
        >
            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: spendingCategoryColor + "15" }}>
                            {iconMap[spendingItemIcon] || spendingItemIcon}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>{entry.name}</h3>
                            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{spendingName}</p>
                        </div>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: entry.direction === "credit" ? "#34C759" : "#FF3B30" }}>
                        {entry.direction === "credit" ? "+" : "-"}
                        {formatAmount(entry.amount)}
                    </p>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>Date</span>
                    <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{formatDateFull(entry.date)}</span>
                </div>

                {entryReceipt !== null && (
                    <div>
                        <p className="text-sm font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>Receipt</p>
                        <div
                            className="relative rounded-xl overflow-hidden h-48 cursor-pointer"
                            style={{ backgroundColor: "var(--muted)" }}
                            onClick={() => setIsReceiptViewerOpen(true)}
                        >
                            <Image
                                src={entryReceipt}
                                alt="Receipt"
                                fill
                                className="object-cover hover:opacity-90 transition-opacity"
                                unoptimized
                            />
                        </div>
                    </div>
                )}

                {entryLink !== null && <LinkRow url={entryLink} />}
            </div>

            <ReceiptViewer
                isOpen={isReceiptViewerOpen}
                onClose={() => setIsReceiptViewerOpen(false)}
                imageUrl={entryReceipt ?? ""}
            />
        </PopinWrapper>
    );
}

function LinkRow({ url }: { url: string }) {
    return (
        <div className="flex items-center justify-between py-2">
            <span className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>Link</span>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary flex items-center gap-1 transition-opacity hover:opacity-70">
                <span className="truncate max-w-[200px]">{url}</span>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
            </a>
        </div>
    );
}
