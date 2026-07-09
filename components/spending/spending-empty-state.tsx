import { Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STARTER_CATEGORIES, StarterCategory } from "@/lib/starter-categories";

interface SpendingEmptyStateProps {
    /** Tap on a starter chip — the Dashboard creates-or-reuses the category and opens the spending popin preselected. */
    onStarterTap: (starter: StarterCategory) => void;
    /** Opens the SpendingItemEditPopin in create mode (the header add button's handler). */
    onAdd: () => void;
}

/**
 * Step 2 of the guided first-run flow — shown in place of the spending
 * carousel while the selected month has no items. Offers the quick-start
 * chips (create-or-reuse a starter category) and a green full-width CTA into
 * the existing SpendingItemEditPopin. The green is deliberate spec: only this
 * body CTA — the indigo header add button stays the primary system button.
 */
export function SpendingEmptyState({ onStarterTap, onAdd }: SpendingEmptyStateProps) {
    return (
        <div className="flex flex-col items-center px-1 pb-1 pt-1.5 text-center motion-safe:animate-in fade-in zoom-in-98 slide-in-from-bottom-[5px] duration-[350ms]">
            <div className="relative mb-3.5 h-[92px] w-[92px]" aria-hidden="true">
                <div className="absolute inset-0 rounded-full bg-[rgba(52,199,89,0.08)]" />
                <div className="absolute inset-4 flex items-center justify-center rounded-full bg-white text-[#2AA24A] shadow-[0_6px_16px_rgba(52,199,89,0.18)]">
                    <ShoppingCart className="h-[30px] w-[30px]" strokeWidth={2} />
                </div>
                <div className="absolute left-2.5 top-0.5 h-[15px] w-[15px] rounded-full bg-primary" />
                <div className="absolute bottom-1.5 right-1 h-2.5 w-2.5 rounded-full bg-(--attention)" />
            </div>

            <div className="mb-2.5 rounded-full bg-[rgba(52,199,89,0.12)] px-[11px] py-1 text-[11px] font-bold tracking-[0.5px] text-[#1F9E4A]">
                STEP 2 OF 2
            </div>

            <p className="mb-[5px] text-lg font-bold tracking-[-0.01em] text-foreground">What are you spending on?</p>

            <p className="mb-3.5 max-w-[250px] text-[13px] leading-[1.45] text-muted-foreground">Tap a category to start, or add your own.</p>

            <div className="mb-3.5 w-full rounded-2xl bg-[#F7F7F9] p-[13px]">
                <p className="mb-2.5 text-left text-[11px] font-bold tracking-[0.5px] text-muted-foreground">QUICK START · TAP TO ADD</p>

                <div className="flex flex-wrap gap-2">
                    {STARTER_CATEGORIES.map(starter => (
                        <button
                            key={starter.name}
                            type="button"
                            onClick={() => onStarterTap(starter)}
                            className="flex items-center gap-[7px] rounded-full border border-[#E4E4E7] bg-white px-[13px] py-2 text-[13px] font-semibold text-[#1D1D1F] shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-200 active:scale-95"
                        >
                            <span className="h-[9px] w-[9px] rounded-full" style={{ backgroundColor: starter.color }} aria-hidden="true" />
                            {starter.name}
                        </button>
                    ))}
                </div>
            </div>

            <Button
                className="w-full bg-[#34C759] shadow-[0_4px_14px_rgba(52,199,89,0.32)] hover:bg-[#30B850] hover:shadow-[0_7px_20px_rgba(52,199,89,0.4)] active:bg-[#2AA24A] active:shadow-[0_3px_10px_rgba(52,199,89,0.3)]"
                onClick={onAdd}
            >
                <Plus className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
                Add Spending Item
            </Button>
        </div>
    );
}
