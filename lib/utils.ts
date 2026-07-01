import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { centsToAmount } from "@/lib/money"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format an integer-cents money value for display, with a trailing currency
 * symbol and K/M/B/T abbreviation for large magnitudes. This is the single
 * "convert out" edge: the input is integer cents and the ÷100 to major units
 * happens here (via {@link centsToAmount}) and nowhere else, so callers pass
 * raw cents straight from state/props without dividing first.
 */
export const formatAmount = (cents: number, symbol: string = "$") => {
    const amount = centsToAmount(cents);

    if (amount >= 1_000_000_000_000) {
        return `${(amount / 1_000_000_000_000).toFixed(1)}T ${symbol}`;
    }
    if (amount >= 1_000_000_000) {
        return `${(amount / 1_000_000_000).toFixed(1)}B ${symbol}`;
    }
    if (amount >= 1_000_000) {
        return `${(amount / 1_000_000).toFixed(1)}M ${symbol}`;
    }
    if (amount >= 10_000) {
        return `${(amount / 1_000).toFixed(1)}K ${symbol}`;
    }
    return `${amount.toLocaleString()} ${symbol}`;
};