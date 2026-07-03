"use client";

import { useState } from "react";
import Image from "next/image";
import { SpendingEntry } from "../spending-card-expanded";
import { PopinWrapper } from "@/components/ui/popin-wrapper";
import { iconMap } from "@/lib/icon-map";
import { useSettings } from "@/lib/settings-context";
import { ReceiptViewer } from "@/components/ui/receipt-viewer";

interface EntryDetailPopinProps {
    isOpen: boolean;
    onClose: () => void;
    onEdit: () => void;
    entry: SpendingEntry | null;
    spendingName: string;
    spendingItemIcon: string;
    spendingCategoryColor: string;
}

export function EntryDetailPopin(props: EntryDetailPopinProps) {
    const { isOpen, onClose, onEdit, entry, spendingName, spendingItemIcon, spendingCategoryColor } = props;
    const { formatDateFull, formatAmount } = useSettings();
    const [isReceiptViewerOpen, setIsReceiptViewerOpen] = useState(false);

    if (!entry) return null;

    const entryLink = entry.link || null;
    const entryReceipt = entry.receipt || null;

    return (
        <PopinWrapper
            isOpen={isOpen}
            onClose={onClose}
            title="Entry Details"
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
                <button
                    onClick={onClose}
                    className="w-full py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]"
                    style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
                >
                    Close
                </button>
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
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold flex items-center gap-1 transition-opacity hover:opacity-70" style={{ color: "#007AFF" }}>
                <span className="truncate max-w-[200px]">{url}</span>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
            </a>
        </div>
    );
}