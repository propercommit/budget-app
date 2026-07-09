"use client";

import { useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { Logo } from "./logo";
import { WELCOME_BANNER_DISMISSED_KEY } from "@/lib/first-run";

/** Mounted banners to notify on dismissal (localStorage fires no event in the writing tab). */
const dismissListeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {

    dismissListeners.add(onChange);

    return () => { dismissListeners.delete(onChange); };
}

function readIsDismissed(): boolean {
    return localStorage.getItem(WELCOME_BANNER_DISMISSED_KEY) !== null;
}

/** The server can't read localStorage — report "dismissed" so SSR and the hydration render agree on hidden. */
function readIsDismissedOnServer(): boolean {
    return true;
}

/**
 * First-run welcome banner, shown under the MonthPicker while the account is
 * completely empty (the Dashboard gates on that — this component only owns
 * dismissal).
 *
 * Dismissal is a per-browser localStorage flag, read via
 * `useSyncExternalStore` so the server render (which can't see it) stays
 * hidden and the banner fades in right after hydration for users who never
 * dismissed it.
 */
export function WelcomeBanner() {

    const isDismissed = useSyncExternalStore(subscribe, readIsDismissed, readIsDismissedOnServer);

    const dismiss = () => {
        localStorage.setItem(WELCOME_BANNER_DISMISSED_KEY, "1");

        for (const listener of dismissListeners) listener();
    };

    if (isDismissed === true) return null;

    return (
        <div className="flex items-center gap-3 rounded-[18px] border border-primary/[0.14] bg-primary/[0.06] px-3.5 py-[13px] motion-safe:animate-in fade-in duration-[400ms]">
            <div className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-[13px] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
                <Logo size="sm" animated={false} />
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">Welcome to Budget Planner</p>
                <p className="text-xs text-[#6B6B70]">Two quick steps to get set up.</p>
            </div>

            <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss welcome banner"
                className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-primary/10 hover:text-foreground"
            >
                <X className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
            </button>
        </div>
    );
}
