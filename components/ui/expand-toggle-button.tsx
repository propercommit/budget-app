"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandToggleButtonProps {
    isExpanded: boolean;
    onToggle: () => void;
    className?: string;
}

export function ExpandToggleButton({ isExpanded, onToggle, className }: ExpandToggleButtonProps) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onToggle();
            }}
            aria-label={isExpanded ? "Collapse" : "Expand"}
            className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center bg-muted hover:bg-input transition-colors touch-manipulation",
                className
            )}
        >
            <ChevronDown
                className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", isExpanded && "rotate-180")}
            />
        </button>
    );
}