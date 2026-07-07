"use client";

import { cn } from "@/lib/utils";

/**
 * Inset hairline between grouped-list rows — shared by the sheet modals'
 * field groups and the settings section cards so the hairline style can't
 * drift between the two surfaces.
 */
export function InsetDivider({ className }: { className?: string }) {

    return <div className={cn("ml-4 h-px bg-border", className)} />;
}
