"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandToggleBarProps {
    isExpanded: boolean;
    onToggle: () => void;
}

/**
 * Full-width expand/collapse affordance at the bottom of the spending card.
 * Replaces the old header chevron so the header keeps its width for the item
 * name at carousel size, and the touch target spans the whole card.
 */
export function ExpandToggleBar({ isExpanded, onToggle }: ExpandToggleBarProps) {
    return (
        <button
            aria-label={isExpanded ? "Hide entries" : "Show entries"}
            aria-expanded={isExpanded}
            onClick={(e) => {
                e.stopPropagation();
                onToggle();
            }}
            className="w-full mt-2 py-[5px] sm:py-1.5 rounded-lg flex items-center justify-center hover:bg-foreground/5 transition-colors touch-manipulation"
        >
            <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform duration-200", isExpanded && "rotate-180")} />
        </button>
    );
}
