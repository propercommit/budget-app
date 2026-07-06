"use client";

import { Pencil } from "lucide-react";
import { ExpandToggleButton } from "../ui/expand-toggle-button";

interface CardActionPillProps {
    isExpanded: boolean;
    onToggle: () => void;
    onEdit: () => void;
}

/**
 * Edit + expand control shared by the spending card headers. The pencil is
 * gated to sm: and up — at mobile carousel width it would crush the item
 * name (editing stays reachable on mobile via the detail popin).
 */
export function CardActionPill({ isExpanded, onToggle, onEdit }: CardActionPillProps) {
    return (
        <div className="flex rounded-full overflow-hidden flex-shrink-0 bg-muted">
            <button
                aria-label="Edit spending item"
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                }}
                className="w-10 h-10 hidden sm:flex items-center justify-center hover:bg-input transition-colors touch-manipulation"
            >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <div className="w-px my-2.5 hidden sm:block bg-border" />
            <ExpandToggleButton
                isExpanded={isExpanded}
                onToggle={onToggle}
                className="w-10 h-10 rounded-none bg-transparent"
            />
        </div>
    );
}
