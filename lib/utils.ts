import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { centsToAmount } from "@/lib/money"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Non-breaking space between a value and its currency symbol: the pair must
// never split across lines (a narrow flex cell would otherwise wrap "1,234"
// and "$" onto separate lines, e.g. the spent value on a mobile spending card).
const NBSP = "\u00A0";

/**
 * Format an integer-cents money value for display, with a trailing currency
 * symbol and K/M/B/T abbreviation for large magnitudes. This is the single
 * "convert out" edge: the input is integer cents and the ÷100 to major units
 * happens here (via {@link centsToAmount}) and nowhere else, so callers pass
 * raw cents straight from state/props without dividing first. The symbol is
 * joined with a non-breaking space, so the whole result renders as one
 * unbreakable token.
 */
export const formatAmount = (cents: number, symbol: string = "$") => {
    const amount = centsToAmount(cents);

    if (amount >= 1_000_000_000_000) {
        return `${(amount / 1_000_000_000_000).toFixed(1)}T${NBSP}${symbol}`;
    }
    if (amount >= 1_000_000_000) {
        return `${(amount / 1_000_000_000).toFixed(1)}B${NBSP}${symbol}`;
    }
    if (amount >= 1_000_000) {
        return `${(amount / 1_000_000).toFixed(1)}M${NBSP}${symbol}`;
    }
    if (amount >= 10_000) {
        return `${(amount / 1_000).toFixed(1)}K${NBSP}${symbol}`;
    }
    return `${amount.toLocaleString()}${NBSP}${symbol}`;
};