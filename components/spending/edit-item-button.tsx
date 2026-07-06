"use client";

import { Pencil } from "lucide-react";

interface EditItemButtonProps {
    onEdit: () => void;
}

/**
 * Round header button opening the spending item's edit popin directly —
 * the only header action, so a long item name keeps its width at carousel
 * size (the expand affordance lives in ExpandToggleBar at the card bottom).
 */
export function EditItemButton({ onEdit }: EditItemButtonProps) {
    return (
        <button
            aria-label="Edit spending item"
            onClick={onEdit}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-muted hover:bg-input transition-colors touch-manipulation"
        >
            <Pencil className="w-[15px] h-[15px] text-muted-foreground" />
        </button>
    );
}
