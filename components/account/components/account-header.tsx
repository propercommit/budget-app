"use client";

import { ChevronLeft } from "lucide-react";

interface AccountHeaderProps {
    onBack: () => void;
}

/** Slim v2 header: green back-to-dashboard button and a centered page title. */
export function AccountHeader({ onBack }: AccountHeaderProps) {

    return (
        <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
            <div className="mx-auto grid max-w-2xl grid-cols-[1fr_auto_1fr] items-center px-2 py-2.5 sm:px-4 sm:py-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-0.5 justify-self-start rounded-lg p-1.5 text-base font-medium text-primary transition-colors hover:bg-primary/10 active:bg-primary/15 sm:text-[15px]"
                    aria-label="Back to dashboard"
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
                    <span className="hidden sm:inline">Dashboard</span>
                    <span className="sm:hidden">Back</span>
                </button>
                <h1 className="text-base font-semibold text-foreground">Account</h1>
                <div />
            </div>
        </header>
    );
}
