"use client";

// ============================================
// ENTRY DETAIL POPIN (View Mode)
// ============================================

import { SpendingEntry } from "../spending-card-expanded";

interface EntryDetailPopinProps {
    isOpen: boolean;
    onClose: () => void;
    onEdit: () => void;
    entry: SpendingEntry | null;
    spendingName: string;
    spendingItemIcon: string;
    spendingCategoryColor: string;
}

const formatFullDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
};

export function EntryDetailPopin({
    isOpen,
    onClose,
    onEdit,
    entry,
    spendingName,
    spendingItemIcon,
    spendingCategoryColor,
}: EntryDetailPopinProps) {
    if (!isOpen || !entry) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            style={{
                fontFamily:
                    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
            }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(4px)" }}
                onClick={onClose}
            />

            {/* Popin */}
            <div
                className="relative w-full sm:max-w-md bg-white rounded-3xl overflow-hidden mx-3 sm:mx-0 mb-3 sm:mb-0"
                style={{ boxShadow: "0 -8px 40px rgba(0, 0, 0, 0.15)" }}
            >
                {/* Mobile Handle */}
                <div className="sm:hidden flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "#E5E5EA" }} />
                </div>

                {/* Header */}
                <div
                    className="flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: "1px solid #E5E5EA" }}
                >
                    <h2 className="text-lg font-semibold" style={{ color: "#1D1D1F" }}>
                        Entry Details
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onEdit}
                            className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95"
                            style={{ backgroundColor: "#F5F5F7" }}
                        >
                            <svg
                                className="w-5 h-5"
                                style={{ color: "#6E6E73" }}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                            </svg>
                        </button>
                        <button
                            onClick={onClose}
                            className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95"
                            style={{ backgroundColor: "#F5F5F7" }}
                        >
                            <svg
                                className="w-5 h-5"
                                style={{ color: "#6E6E73" }}
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

                {/* Content */}
                <div className="px-5 py-5 space-y-5">
                    {/* Hero */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                                style={{ backgroundColor: `${spendingCategoryColor}15` }}
                            >
                                {spendingItemIcon}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold" style={{ color: "#1D1D1F" }}>
                                    {entry.name}
                                </h3>
                                <p className="text-sm" style={{ color: "#6E6E73" }}>
                                    {spendingName}
                                </p>
                            </div>
                        </div>
                        <p className="text-2xl font-bold" style={{ color: "#FF3B30" }}>
                            -${entry.amount.toFixed(2)}
                        </p>
                    </div>

                    {/* Divider */}
                    <div
                        className="h-px"
                        style={{
                            background: "linear-gradient(to right, transparent, #E5E5EA, transparent)",
                        }}
                    />

                    {/* Date */}
                    <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium" style={{ color: "#6E6E73" }}>
                            Date
                        </span>
                        <span className="text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                            {formatFullDate(entry.date)}
                        </span>
                    </div>

                    {/* Receipt */}
                    {entry.receipt && (
                        <div>
                            <p className="text-sm font-medium mb-2" style={{ color: "#6E6E73" }}>
                                Receipt
                            </p>
                            <div
                                className="rounded-xl overflow-hidden"
                                style={{ backgroundColor: "#F5F5F7" }}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={entry.receipt}
                                    alt="Receipt"
                                    className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(entry.receipt!, "_blank")}
                                />
                            </div>
                        </div>
                    )}

                    {/* Link */}
                    {entry.link && (
                        <div className="flex items-center justify-between py-2">
                            <span className="text-sm font-medium" style={{ color: "#6E6E73" }}>
                                Link
                            </span>
                            
                                href={entry.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-semibold flex items-center gap-1 transition-opacity hover:opacity-70"
                                style={{ color: "#007AFF" }}
                            >
                                <span className="truncate max-w-[200px]">{entry.link}</span>
                                <svg
                                    className="w-4 h-4 flex-shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                    />
                                </svg>
                            </a>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4" style={{ borderTop: "1px solid #E5E5EA" }}>
                    <button
                        onClick={onClose}
                        className="w-full py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]"
                        style={{ backgroundColor: "#F5F5F7", color: "#1D1D1F" }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}