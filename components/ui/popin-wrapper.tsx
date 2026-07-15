"use client";

import { useRef, useState, useEffect, ReactNode, TouchEventHandler, UIEvent } from "react";
import { X } from "lucide-react";
import { useLockScroll } from "@/components/hooks/use-lock-scroll";

/** Fixed clearance above the content for the floating chip header. */
const FLOATING_HEADER_CLEARANCE = 76;

/**
 * Breathing room kept between the deepest content and the revealed floating
 * footer at full scroll. The footer's height is measured (it grows when e.g.
 * a delete confirm arms), so the scroller's bottom clearance is
 * `footer height + this gap`.
 */
const FLOATING_FOOTER_GAP = 40;

interface PopinWrapperProps {
    isOpen: boolean;
    onClose: () => void;
    /** Standard-chrome title bar text. Ignored when `floatingHeader` is set. */
    title?: string;
    subtitle?: string;
    headerActions?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    zIndex?: number;
    /**
     * Touch passthrough to the sheet element, so gestures (e.g. a pager
     * swipe) cover the whole sheet — header, footer and gutters included —
     * not just the consumer's content area.
     */
    onTouchStart?: TouchEventHandler<HTMLDivElement>;
    onTouchEnd?: TouchEventHandler<HTMLDivElement>;
    /**
     * Changing this remounts the sheet (e.g. per pager page turn), replaying
     * any entrance animation in `sheetClassName` on the whole sheet.
     */
    sheetKey?: string | number;
    /**
     * Extra classes for the sheet element (e.g. animate-in utilities, or
     * touch-pan-y for popins that own horizontal gestures — note touch-action
     * intersects down the tree, so only set it when no child needs pan-x).
     */
    sheetClassName?: string;
    /**
     * Floating-chrome mode. Instead of the standard title bar, this node
     * (typically a live-preview chip) floats over the top of the scrolling
     * content with `headerActions` and the close button beside it, and the
     * header padding condenses once the content is scrolled. The footer
     * becomes an overlay that slides in on scroll — or is pinned visible when
     * the content has nothing to scroll, since a scroll-gated footer would
     * otherwise be unreachable on tall viewports.
     */
    floatingHeader?: ReactNode;
}

/** The shared 44px circular dismiss button, identical in both chrome modes. */
function CloseButton({ onClose }: { onClose: () => void }) {
    return (
        <button
            onClick={onClose}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 bg-muted"
        >
            <X className="w-5 h-5 text-muted-foreground" />
        </button>
    );
}

export function PopinWrapper(props: PopinWrapperProps) {

    useLockScroll(props.isOpen);

    if (!props.isOpen) return null;

    // The sheet is its own component so per-open state (scroll position
    // flags, measured clearances) starts fresh on every open instead of
    // leaking across closes.
    return <PopinSheet {...props} />;
}

function PopinSheet({
    onClose,
    title,
    subtitle,
    headerActions,
    children,
    footer,
    zIndex,
    onTouchStart,
    onTouchEnd,
    sheetKey,
    sheetClassName,
    floatingHeader,
}: PopinWrapperProps) {
    const popinRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const footerRef = useRef<HTMLDivElement>(null);
    const [scrolled, setScrolled] = useState(false);
    const [scrollable, setScrollable] = useState(true);
    const [footerClearance, setFooterClearance] = useState(120);

    const isFloating = floatingHeader !== undefined;

    useEffect(() => {
        popinRef.current?.focus();
    }, []);

    // Tracks whether the content overflows and how much room the floating
    // footer needs: the observer fires on mount, on viewport resizes (the
    // scroller's box tracks vh) and on content or footer growth (e.g. a
    // validation message appearing, a delete confirm arming). Scrollability
    // is computed from the content's own height plus the final clearances —
    // not from `scrollHeight`, which still reflects the previously applied
    // padding when the clearance changes in the same pass.
    useEffect(() => {
        if (!isFloating) return;

        const scroller = scrollRef.current;
        const content = contentRef.current;

        if (scroller === null || content === null) return;

        const measure = () => {
            const footerEl = footerRef.current;
            const clearance = footerEl !== null ? footerEl.offsetHeight + FLOATING_FOOTER_GAP : 120;

            setFooterClearance(clearance);
            setScrollable(content.offsetHeight + FLOATING_HEADER_CLEARANCE + clearance > scroller.clientHeight);
        };

        const observer = new ResizeObserver(measure);

        observer.observe(scroller);
        observer.observe(content);

        if (footerRef.current !== null) observer.observe(footerRef.current);

        return () => observer.disconnect();
    }, [isFloating]);

    const handleScroll = (e: UIEvent<HTMLDivElement>) => {
        setScrolled(e.currentTarget.scrollTop > 8);
    };

    const footerVisible = scrolled || !scrollable;

    return (
        <div
            className={`fixed inset-0 ${zIndex ? "" : "z-50"} flex items-end sm:items-center justify-center`}
            style={{
                ...(zIndex ? { zIndex } : {}),
                fontFamily:
                    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
            }}
        >
            {/* touch-action none: touches on the dim area must never pan or
                zoom the page beneath (iOS lets them bleed through otherwise). */}
            <div
                className="absolute inset-0"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(4px)", touchAction: "none", overscrollBehavior: "contain" }}
                onClick={onClose}
            />

            <div
                key={sheetKey}
                ref={popinRef}
                tabIndex={-1}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                className={`relative w-full sm:max-w-md lg:max-w-lg xl:max-w-xl bg-card rounded-3xl overflow-hidden outline-none mx-3 sm:mx-0 mb-3 sm:mb-0 ${sheetClassName ?? ""}`}
                style={{
                    boxShadow: "0 -8px 40px rgba(0, 0, 0, 0.15)",
                    maxHeight: "90vh",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {isFloating ? (
                    /* pointer-events-none lets taps in the gap between the
                       chip and the close button reach the content scrolling
                       beneath the overlay. */
                    <div
                        className="absolute top-0 left-0 right-0 z-[2] flex items-center justify-between pointer-events-none"
                        style={{ padding: scrolled ? "8px 20px" : "16px 20px", transition: "padding 0.25s" }}
                    >
                        <div className="pointer-events-auto min-w-0">{floatingHeader}</div>
                        <div className="pointer-events-auto flex items-center gap-2 shrink-0">
                            {headerActions}
                            <CloseButton onClose={onClose} />
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="sm:hidden flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-border" />
                        </div>

                        <div
                            className="flex items-center justify-between px-5 py-4 border-b border-border"
                        >
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">
                                    {title}
                                </h2>
                                {subtitle && (
                                    <p className="text-sm text-muted-foreground">
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {headerActions}
                                <CloseButton onClose={onClose} />
                            </div>
                        </div>
                    </>
                )}

                {/* overscroll containment: hitting the end of the sheet's own
                    scroll must not rubber-band into scrolling the page. */}
                <div
                    ref={scrollRef}
                    data-popin-scroll
                    onScroll={isFloating ? handleScroll : undefined}
                    className={`flex-1 overflow-y-auto overscroll-contain px-5 ${isFloating ? "" : "py-5"}`}
                    style={isFloating ? { paddingTop: FLOATING_HEADER_CLEARANCE, paddingBottom: footerClearance } : undefined}
                >
                    <div ref={contentRef}>{children}</div>
                </div>

                {footer !== undefined && (
                    <div
                        ref={footerRef}
                        className={`px-5 py-4 border-t border-border${isFloating ? " absolute bottom-0 left-0 right-0 z-[2] bg-card" : ""}`}
                        style={isFloating ? {
                            boxShadow: "0 -8px 24px rgba(0, 0, 0, 0.06)",
                            transform: footerVisible ? "translateY(0)" : "translateY(110%)",
                            transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
                        } : undefined}
                    >
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
