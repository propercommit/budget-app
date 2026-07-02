"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Category } from "@/lib/types";
import { CATEGORY_DELETE_WARNING } from "@/lib/constants";

interface DeleteCategoryDialogProps {
    category: Category;
    onCancel: () => void;
    /** Runs the delete; the dialog disables its buttons until it settles. */
    onConfirm: () => Promise<void>;
}

/**
 * Centered confirmation dialog for the global category cascade delete. Kept
 * bespoke and local: Radix Dialog is reserved for the account modals, and
 * PopinWrapper is a bottom sheet on mobile while this must stay a centered
 * alert on every viewport. Rendered at z-70, above the Manage popin (z-50)
 * and the category edit popin (z-60).
 */
export function DeleteCategoryDialog({ category, onCancel, onConfirm }: DeleteCategoryDialogProps) {

    const [isDeleting, setIsDeleting] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Move focus into the dialog on open (same pattern as PopinWrapper) so
    // keyboard/screen-reader users don't stay stranded behind the overlay.
    useEffect(() => {
        panelRef.current?.focus();
    }, []);

    const handleConfirm = async () => {

        setIsDeleting(true);

        try {
            await onConfirm();
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCancel = () => {
        if (!isDeleting) onCancel();
    };

    return (
        <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-category-dialog-title"
            aria-describedby="delete-category-dialog-description"
            className="fixed inset-0 flex items-center justify-center p-6"
            style={{ zIndex: 70 }}
            onKeyDown={(e) => { if (e.key === "Escape") handleCancel(); }}
        >
            <div
                className="absolute inset-0"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(4px)" }}
                onClick={handleCancel}
            />

            <div
                ref={panelRef}
                tabIndex={-1}
                className="relative w-full max-w-[320px] sm:max-w-[380px] bg-white rounded-3xl p-6 text-center outline-none"
                style={{ boxShadow: "0 30px 60px rgba(0, 0, 0, 0.3)" }}
            >
                <div
                    className="w-[60px] h-[60px] rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: "rgba(255, 59, 48, 0.08)" }}
                >
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#FF3B30" strokeWidth={1.9}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </div>

                <h2 id="delete-category-dialog-title" className="text-lg font-bold mb-2" style={{ color: "#1D1D1F" }}>
                    {`Delete "${category.label}"?`}
                </h2>

                <p id="delete-category-dialog-description" className="text-sm leading-relaxed mb-6" style={{ color: "#6E6E73" }}>
                    {CATEGORY_DELETE_WARNING}
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={handleCancel}
                        disabled={isDeleting}
                        className="flex-1 py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                        style={{ backgroundColor: "#F5F5F7", color: "#1D1D1F" }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        className="flex-1 py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-70"
                        style={{ backgroundColor: "#FF3B30" }}
                    >
                        {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
