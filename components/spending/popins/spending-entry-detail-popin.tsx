"use client";

import Image from "next/image";
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

function formatFullDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

export function EntryDetailPopin(props: EntryDetailPopinProps) {
    const { isOpen, onClose, onEdit, entry, spendingName, spendingItemIcon, spendingCategoryColor } = props;

    if (!isOpen || !entry) return null;

    const entryLink = entry.link || null;
    const entryReceipt = entry.receipt || null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>
            <div className="absolute inset-0" style={{ backgroundColor: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(4px)" }} onClick={onClose} />

            <div className="relative w-full sm:max-w-md bg-white rounded-3xl overflow-hidden mx-3 sm:mx-0 mb-3 sm:mb-0" style={{ boxShadow: "0 -8px 40px rgba(0, 0, 0, 0.15)" }}>
                <div className="sm:hidden flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "#E5E5EA" }} />
                </div>

                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #E5E5EA" }}>
                    <h2 className="text-lg font-semibold" style={{ color: "#1D1D1F" }}>Entry Details</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={onEdit} className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95" style={{ backgroundColor: "#F5F5F7" }}>
                            <svg className="w-5 h-5" style={{ color: "#6E6E73" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                        <button onClick={onClose} className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95" style={{ backgroundColor: "#F5F5F7" }}>
                            <svg className="w-5 h-5" style={{ color: "#6E6E73" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="px-5 py-5 space-y-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: spendingCategoryColor + "15" }}>
                                {spendingItemIcon}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold" style={{ color: "#1D1D1F" }}>{entry.name}</h3>
                                <p className="text-sm" style={{ color: "#6E6E73" }}>{spendingName}</p>
                            </div>
                        </div>
                        <p className="text-2xl font-bold" style={{ color: "#FF3B30" }}>
                            -${entry.amount.toFixed(2)}
                        </p>
                    </div>

                    <div className="h-px" style={{ background: "linear-gradient(to right, transparent, #E5E5EA, transparent)" }} />

                    <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium" style={{ color: "#6E6E73" }}>Date</span>
                        <span className="text-sm font-semibold" style={{ color: "#1D1D1F" }}>{formatFullDate(entry.date)}</span>
                    </div>

                    {entryReceipt !== null && (
                        <div>
                            <p className="text-sm font-medium mb-2" style={{ color: "#6E6E73" }}>Receipt</p>
                            <div className="relative rounded-xl overflow-hidden h-48 cursor-pointer" style={{ backgroundColor: "#F5F5F7" }} onClick={() => window.open(entryReceipt, "_blank")}>
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

                <div className="px-5 py-4" style={{ borderTop: "1px solid #E5E5EA" }}>
                    <button onClick={onClose} className="w-full py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]" style={{ backgroundColor: "#F5F5F7", color: "#1D1D1F" }}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function LinkRow({ url }: { url: string }) {
    return (
        <div className="flex items-center justify-between py-2">
            <span className="text-sm font-medium" style={{ color: "#6E6E73" }}>Link</span>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold flex items-center gap-1 transition-opacity hover:opacity-70" style={{ color: "#007AFF" }}>
                <span className="truncate max-w-[200px]">{url}</span>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
            </a>
        </div>
    );
}