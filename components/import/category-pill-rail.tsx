"use client";

import { Ban, MinusCircle } from "lucide-react";
import type { Category } from "@/lib/types";
import { iconMap } from "@/lib/icon-map";
import { INCOME_DESTINATION, type DestinationInfo } from "@/components/import/destination";

interface CategoryPillRailProps {
    categories: Category[];
    /** Debits never see the Income pill — a debit cannot be routed to income. */
    direction: "debit" | "credit";
    selectedDest: string | null;
    /** Adds the trailing "Leave out" / "Always exclude" pills (decision rows only). */
    showExcludeActions: boolean;
    /** Hides every destination pill — for rows the server would refuse to route (text-less lines). */
    excludeOnly?: boolean;
    onPick: (dest: string) => void;
    onLeaveOut?: () => void;
    onAlwaysExclude?: () => void;
}

const PILL_CLASSES =
    "flex-shrink-0 flex items-center gap-1.5 px-3 h-11 sm:h-[38px] rounded-xl text-[13px] font-semibold cursor-pointer transition-all duration-150 active:scale-95";

/**
 * The horizontal destination picker under a review row: Income first (credits
 * only), then every category, then — on decision rows — the two exclusion
 * pills, gapped from the categories so "route" and "drop" read as different
 * families.
 */
export function CategoryPillRail({
    categories,
    direction,
    selectedDest,
    showExcludeActions,
    excludeOnly = false,
    onPick,
    onLeaveOut,
    onAlwaysExclude,
}: CategoryPillRailProps) {

    // Category is structurally a DestinationInfo already — no re-shaping.
    const routable: DestinationInfo[] = direction === "credit" ? [INCOME_DESTINATION, ...categories] : categories;

    const destinations = excludeOnly ? [] : routable;

    return (
        <div
            className="flex gap-1.5 overflow-x-auto mt-2.5 px-0.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="radiogroup"
            aria-label="Choose a destination"
        >
            {destinations.map((destination) => {
                const selected = destination.id === selectedDest;
                const incomeTint = destination.id === INCOME_DESTINATION.id && !selected;

                return (
                    <button
                        key={destination.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onPick(destination.id)}
                        className={`${PILL_CLASSES} ${selected || incomeTint ? "" : "bg-muted text-muted-foreground"}`}
                        style={
                            selected
                                ? { backgroundColor: destination.color, color: "#FFFFFF" }
                                : incomeTint
                                    ? { backgroundColor: "rgba(52, 199, 89, 0.10)", color: "#1F7A38" }
                                    : undefined
                        }
                    >
                        <span className="flex [&_svg]:size-4">{iconMap[destination.icon] ?? destination.icon}</span>
                        {destination.label}
                    </button>
                );
            })}

            {showExcludeActions && (
                <>
                    <button
                        type="button"
                        onClick={onLeaveOut}
                        className={`${PILL_CLASSES} ml-2.5 bg-muted text-muted-foreground border border-dashed border-border`}
                    >
                        <MinusCircle className="size-4" strokeWidth={2} />
                        Leave out
                    </button>

                    <button
                        type="button"
                        onClick={onAlwaysExclude}
                        className={`${PILL_CLASSES} text-destructive bg-destructive/5 border border-dashed border-destructive/30`}
                    >
                        <Ban className="size-4" strokeWidth={2} />
                        Always exclude
                    </button>
                </>
            )}
        </div>
    );
}
