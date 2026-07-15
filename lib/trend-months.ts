import { IncomeSource, SpendingItem } from "./types";

/**
 * The month axis for the trends card: every `"YYYY-MM"` month up to and
 * including `selectedMonth` that has a spending bucket OR an income source,
 * sorted ascending. Income-only months matter — income can exist in a month
 * with no spending items, and it must still chart. Relies on months being
 * zero-padded `"YYYY-MM"` strings (lexicographic order = chronological order).
 */
export function getTrendMonths(
    spendingData: Record<string, SpendingItem[]>,
    incomeSources: IncomeSource[],
    selectedMonth: string,
): string[] {

    const months = new Set([...Object.keys(spendingData), ...incomeSources.map(source => source.month)]);

    return [...months]
        .filter(month => month <= selectedMonth)
        .sort((a, b) => a.localeCompare(b));
}
