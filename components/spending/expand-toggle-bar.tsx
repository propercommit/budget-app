"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandToggleBarProps {
    isExpanded: boolean;
    onToggle: () => void;
}

// One hint per page load: the first collapsed bar to mount claims it; remounts
// and the other carousel cards stay quiet until the next full load.
let hintConsumed = false;

/**
 * Full-width expand/collapse affordance at the bottom of the spending card.
 * Replaces the old header chevron so the header keeps its width for the item
 * name at carousel size, and the touch target spans the whole card.
 *
 * On load, the first collapsed bar shows a one-time "View entries" hint that
 * slides in beside the chevron, holds ~1.5s, then fades away. The label is
 * absolutely positioned so it never takes layout width — the chevron stays
 * put throughout and the card geometry is untouched.
 */
export function ExpandToggleBar({ isExpanded, onToggle }: ExpandToggleBarProps) {

    const [showHint, setShowHint] = useState(false);

    useEffect(() => {
        if (isExpanded === true || hintConsumed === true) return;

        hintConsumed = true;

        // Timers rather than direct setState: keeps the effect render-quiet
        // (react-hooks lint) and removes the dormant span after the fade.
        const showTimer = setTimeout(() => setShowHint(true), 0);
        const hideTimer = setTimeout(() => setShowHint(false), 2400);

        return () => {
            clearTimeout(showTimer);
            clearTimeout(hideTimer);
        };
    }, [isExpanded]);

    return (
        <button
            aria-label={isExpanded ? "Hide entries" : "Show entries"}
            aria-expanded={isExpanded}
            onClick={onToggle}
            className="w-full mt-2 py-[5px] sm:py-1.5 rounded-lg flex items-center justify-center hover:bg-foreground/5 transition-colors touch-manipulation"
        >
            <div className="relative flex items-center">
                <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform duration-200", isExpanded && "rotate-180")} />

                {showHint && (
                    <>
                        <style>{`
                            @keyframes viewEntriesHint {
                                0% { opacity: 0; transform: translateX(-6px); }
                                12%, 75% { opacity: 1; transform: translateX(0); }
                                100% { opacity: 0; transform: translateX(0); }
                            }
                        `}</style>
                        {/* opacity-0 base keeps the label invisible wherever the
                            animation is stripped (screenshot runs disable them). */}
                        <span
                            aria-hidden="true"
                            className="absolute left-full ml-1.5 text-xs font-medium whitespace-nowrap pointer-events-none opacity-0"
                            style={{ color: "var(--muted-foreground)", animation: "viewEntriesHint 2.2s ease forwards" }}
                        >
                            View entries
                        </span>
                    </>
                )}
            </div>
        </button>
    );
}
