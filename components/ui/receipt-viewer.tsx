"use client";

import { createPortal } from "react-dom";
import toast from "react-hot-toast";

interface ReceiptViewerProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    /**
     * Interaction-time URL refresh for downloads: a viewer left open past the
     * signed URL's TTL must fetch fresh bytes, not a dead link. Optional — a
     * caller passing a stable URL (or a data URL) can omit it.
     */
    getFreshUrl?: () => Promise<string | null>;
}

/** Download filename extension per sniffed blob type; unknowns fall back to jpg. */
const DOWNLOAD_EXTENSIONS: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

export function ReceiptViewer({ isOpen, onClose, imageUrl, getFreshUrl }: ReceiptViewerProps) {
    if (!isOpen) return null;

    // The anchor `download` attribute is ignored cross-origin (WHATWG), so a
    // remote signed URL would navigate instead of downloading. Fetching into a
    // blob makes the anchor same-origin (`blob:`), which downloads everywhere
    // — and works unchanged for data URLs.
    const handleDownload = async () => {
        try {
            const source = getFreshUrl !== undefined ? await getFreshUrl() : imageUrl;

            if (source === null || source === "") {
                toast.error("Couldn't download the receipt");
                return;
            }

            const response = await fetch(source);

            if (response.ok === false) throw new Error(`Receipt download failed with status ${response.status}`);

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = objectUrl;
            a.download = `receipt.${DOWNLOAD_EXTENSIONS[blob.type] ?? "jpg"}`;
            a.click();

            URL.revokeObjectURL(objectUrl);
        } catch (error) {
            console.error("Failed to download receipt:", error);
            toast.error("Couldn't download the receipt");
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex flex-col"
            style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
            onClick={onClose}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 pt-12 pb-4"
                onClick={(e) => e.stopPropagation()}
            >
                <span className="text-white font-semibold text-base">Receipt</span>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { void handleDownload(); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white transition-opacity active:opacity-70"
                        style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                    </button>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity active:opacity-70"
                        style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                    >
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Image */}
            <div
                className="flex-1 flex items-center justify-center px-4 pb-12"
                onClick={(e) => e.stopPropagation()}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={imageUrl}
                    alt="Receipt"
                    className="max-w-full max-h-full rounded-2xl object-contain"
                    style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }}
                />
            </div>
        </div>,
        document.body
    );
}
