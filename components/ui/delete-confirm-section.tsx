"use client";

import { useState } from "react";

interface DeleteConfirmSectionProps {
    label: string;
    confirmMessage?: string;
    onDelete: () => void;
    disabled?: boolean;
}

export function DeleteConfirmSection({
    label,
    confirmMessage = "Are you sure? This action cannot be undone.",
    onDelete,
    disabled = false,
}: DeleteConfirmSectionProps) {
    const [showConfirm, setShowConfirm] = useState(false);

    if (!showConfirm) {
        return (
            <button
                onClick={() => setShowConfirm(true)}
                disabled={disabled}
                className="w-full py-3 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] hover:bg-red-50 flex items-center justify-center gap-2"
                style={{
                    border: "1px solid #FF3B30",
                    color: "#FF3B30",
                    opacity: disabled ? 0.5 : 1,
                }}
            >
                <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                </svg>
                {label}
            </button>
        );
    }

    return (
        <div
            className="p-4 rounded-xl"
            style={{
                backgroundColor: "rgba(255, 59, 48, 0.05)",
                border: "1px solid rgba(255, 59, 48, 0.1)",
            }}
        >
            <p
                className="text-sm font-medium text-center mb-3"
                style={{ color: "#1D1D1F" }}
            >
                {confirmMessage}
            </p>
            <div className="flex gap-3">
                <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
                    style={{ backgroundColor: "#F5F5F7", color: "#1D1D1F" }}
                >
                    Cancel
                </button>
                <button
                    onClick={() => {
                        setShowConfirm(false);
                        onDelete();
                    }}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98]"
                    style={{ backgroundColor: "#FF3B30" }}
                >
                    Delete
                </button>
            </div>
        </div>
    );
}