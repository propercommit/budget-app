"use client";

import { useRef, useEffect, ReactNode } from "react";
import { useLockScroll } from "@/components/hooks/use-lock-scroll";

interface PopinWrapperProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    headerActions?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    zIndex?: number;
}

export function PopinWrapper({
    isOpen,
    onClose,
    title,
    subtitle,
    headerActions,
    children,
    footer,
    zIndex,
}: PopinWrapperProps) {
    const popinRef = useRef<HTMLDivElement>(null);

    useLockScroll(isOpen);

    useEffect(() => {
        if (isOpen) {
            popinRef.current?.focus();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 ${zIndex ? "" : "z-50"} flex items-end sm:items-center justify-center`}
            style={{
                ...(zIndex ? { zIndex } : {}),
                fontFamily:
                    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
            }}
        >
            <div
                className="absolute inset-0"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(4px)" }}
                onClick={onClose}
            />

            <div
                ref={popinRef}
                tabIndex={-1}
                className="relative w-full sm:max-w-md lg:max-w-lg xl:max-w-xl bg-card rounded-3xl overflow-hidden outline-none mx-3 sm:mx-0 mb-3 sm:mb-0"
                style={{
                    boxShadow: "0 -8px 40px rgba(0, 0, 0, 0.15)",
                    maxHeight: "90vh",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <div className="sm:hidden flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-border" />
                </div>

                <div
                    className="flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: "1px solid var(--border)" }}
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
                        <button
                            onClick={onClose}
                            className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 bg-muted"
                        >
                            <svg
                                className="w-5 h-5 text-muted-foreground"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5">
                    {children}
                </div>

                {footer && (
                    <div
                        className="px-5 py-4"
                        style={{ borderTop: "1px solid var(--border)" }}
                    >
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}