"use client";

import { Pencil } from "lucide-react";
import { ExpandToggleButton } from "../ui/expand-toggle-button";

interface CardActionPillProps {
    isExpanded: boolean;
    onToggle: () => void;
    onEdit: () => void;
}

/**
 * Edit + expand control shared by the spending card headers. Shown at every
 * width by deliberate choice: in the mobile carousel the pill leaves a long
 * item name ~45px, so it ellipsizes — the design spec's overflow behavior.
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
                className="w-10 h-10 flex items-center justify-center hover:bg-input transition-colors touch-manipulation"
            >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <div className="w-px my-2.5 bg-border" />
            <ExpandToggleButton
                isExpanded={isExpanded}
                onToggle={onToggle}
                className="w-10 h-10 rounded-none bg-transparent"
            />
        </div>
    );
}
