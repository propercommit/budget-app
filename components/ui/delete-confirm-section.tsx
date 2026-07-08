"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

interface DeleteConfirmSectionProps {
    label: string;
    confirmMessage?: string;
    onDelete: () => void;
    disabled?: boolean;
}

/**
 * Two-step destructive action per the button system: an outline button arms
 * the delete, a solid destructive button confirms it.
 */
export function DeleteConfirmSection({
    label,
    confirmMessage = "Are you sure? This action cannot be undone.",
    onDelete,
    disabled = false,
}: DeleteConfirmSectionProps) {
    const [showConfirm, setShowConfirm] = useState(false);

    if (!showConfirm) {
        return (
            <Button
                variant="destructive-outline"
                className="w-full"
                onClick={() => setShowConfirm(true)}
                disabled={disabled}
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
            </Button>
        );
    }

    return (
        <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10">
            <p className="text-sm font-medium text-center mb-3 text-foreground">
                {confirmMessage}
            </p>
            <div className="flex gap-3">
                <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowConfirm(false)}
                >
                    Cancel
                </Button>
                <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                        setShowConfirm(false);
                        onDelete();
                    }}
                >
                    Delete
                </Button>
            </div>
        </div>
    );
}
