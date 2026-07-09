import { Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IncomeEmptyStateProps {
    /** Opens the existing IncomePopin in add mode (the Dashboard's open-income handler). */
    onAdd: () => void;
}

/**
 * Step 1 of the guided first-run flow — shown by the collapsed Income card
 * when the selected month has no income. Replaces the old dashed-donut
 * placeholder with a spot illustration, the step pill and a primary CTA that
 * opens the existing IncomePopin.
 */
export function IncomeEmptyState({ onAdd }: IncomeEmptyStateProps) {
    return (
        <div className="flex flex-col items-center px-2 pb-1 pt-1.5 text-center motion-safe:animate-in fade-in zoom-in-98 slide-in-from-bottom-[5px] duration-[350ms]">
            <div className="relative mb-3.5 h-[92px] w-[92px]" aria-hidden="true">
                <div className="absolute inset-0 rounded-full bg-primary/[0.08]" />
                <div className="absolute inset-4 flex items-center justify-center rounded-full bg-white text-primary shadow-[0_6px_16px_rgba(47,80,200,0.18)]">
                    <Wallet className="h-[30px] w-[30px]" strokeWidth={2} />
                </div>
                <div className="absolute right-3 top-0.5 h-[15px] w-[15px] rounded-full bg-[#34C759]" />
                <div className="absolute bottom-2 left-0.5 h-2.5 w-2.5 rounded-full bg-(--attention)" />
            </div>

            <div className="mb-2.5 rounded-full bg-primary/10 px-[11px] py-1 text-[11px] font-bold tracking-[0.5px] text-primary">
                STEP 1 OF 2
            </div>

            <p className="mb-[5px] text-lg font-bold tracking-[-0.01em] text-foreground">Where does your money come from?</p>

            <p className="mb-[18px] max-w-[250px] text-[13px] leading-[1.45] text-muted-foreground">
                Add salary, freelance, dividends — anything you earn this month.
            </p>

            <Button className="w-full" onClick={onAdd}>
                <Plus className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
                Add Income
            </Button>
        </div>
    );
}
