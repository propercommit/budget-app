import { Lock } from "lucide-react";

/**
 * Trends card body for a first-run account (no income or spending anywhere in
 * the loaded window) — an "Unlocks after month 1" pill over a dashed flat
 * sparkline. The sparkline is hand-rolled inline SVG like every other chart
 * in this codebase; no chart library.
 */
export function TrendsEmptyState() {
    return (
        <div className="px-1 pb-1 pt-2 text-center">
            <div className="mb-3.5 inline-flex items-center gap-[7px] rounded-full bg-primary/10 px-[13px] py-1.5 text-xs font-bold text-primary">
                <Lock className="h-[13px] w-[13px]" strokeWidth={2.2} aria-hidden="true" />
                Unlocks after month 1
            </div>

            <svg width="100%" height="60" viewBox="0 0 300 60" preserveAspectRatio="none" className="block" aria-hidden="true">
                <polyline
                    points="0,44 50,36 100,42 150,24 200,32 250,14 300,20"
                    fill="none"
                    stroke="#D8D8DE"
                    strokeWidth="3"
                    strokeDasharray="2 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>

            <p className="mt-3 text-[15px] font-bold tracking-[-0.01em] text-foreground">See how you trend over time</p>

            <p className="mt-1 text-xs leading-[1.45] text-muted-foreground">Spending, income and net savings, month over month.</p>
        </div>
    );
}
