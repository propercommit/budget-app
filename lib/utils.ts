import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatAmount = (amount: number) => {
    if (amount >= 1_000_000_000_000) {
        return `$${(amount / 1_000_000_000_000).toFixed(1)}T`;
    }
    if (amount >= 1_000_000_000) {
        return `$${(amount / 1_000_000_000).toFixed(1)}B`;
    }
    if (amount >= 1_000_000) {
        return `$${(amount / 1_000_000).toFixed(1)}M`;
    }
    if (amount >= 10_000) {
        return `$${(amount / 1_000).toFixed(1)}K`;
    }
    return `$${amount.toLocaleString()}`;
};