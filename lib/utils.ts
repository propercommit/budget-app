import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatAmount = (amount: number, symbol: string = "$") => {
    if (amount >= 1_000_000_000_000) {
        return `${symbol} ${(amount / 1_000_000_000_000).toFixed(1)}T`;
    }
    if (amount >= 1_000_000_000) {
        return `${symbol} ${(amount / 1_000_000_000).toFixed(1)}B`;
    }
    if (amount >= 1_000_000) {
        return `${symbol} ${(amount / 1_000_000).toFixed(1)}M`;
    }
    if (amount >= 10_000) {
        return `${symbol} ${(amount / 1_000).toFixed(1)}K`;
    }
    return `${symbol} ${amount.toLocaleString()}`;
};