"use client";

import toast from "react-hot-toast";

/**
 * Error toast with an optional Retry action — the third surface of the
 * unified validation system. Toasts are reserved for failures *after the form
 * has closed* (an optimistic API call rolled back, an OAuth bounce); never use
 * one for form validation, and never fire two toasts for one action.
 *
 * The message must name what failed using the item name — `Couldn't save
 * "Groceries"` — not a generic "Failed to update spending item". Pass `retry`
 * whenever the failed call can be replayed; the button dismisses the toast and
 * re-runs it.
 */

/** 18px filled status icon (red circle, white cross), per the toast spec. */
function ToastErrorIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#FF3B30" className="flex-shrink-0" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M8.5 8.5 L15.5 15.5 M15.5 8.5 L8.5 15.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
    );
}

interface ErrorToastOptions {
    /** Replays the failed call. Omit when the action cannot be retried. */
    retry?: () => void;
}

export function showErrorToast(message: string, options?: ErrorToastOptions): void {
    toast.custom((t) => (
        <div
            className="flex items-center"
            style={{
                gap: 10,
                background: "var(--card)",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "12px 16px",
                fontSize: 14,
                fontWeight: 500,
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
                opacity: t.visible ? 1 : 0,
                transform: t.visible ? "translateY(0)" : "translateY(8px)",
                transition: "opacity 0.3s ease, transform 0.3s ease",
            }}
        >
            <ToastErrorIcon />
            <span>{message}</span>
            {options?.retry !== undefined && (
                <button
                    onClick={() => {
                        toast.dismiss(t.id);
                        options.retry?.();
                    }}
                    className="cursor-pointer border-none bg-transparent p-0"
                    style={{ marginLeft: 4, fontSize: 14, fontWeight: 600, color: "#007AFF" }}
                >
                    Retry
                </button>
            )}
        </div>
    ));
}
