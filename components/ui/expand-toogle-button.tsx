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
                "w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors touch-manipulation",
                className
            )}
        >
            <ChevronDown
                className={cn("w-4 h-4 text-gray-500 transition-transform duration-200", isExpanded && "rotate-180")}
            />
        </button>
    );
}