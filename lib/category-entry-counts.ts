import { SpendingItem } from "@/lib/types";

/**
 * Per-category totals of spending entries, keyed by category id.
 *
 * The dashboard only loads spending for a trailing window of months
 * (`app/page.tsx` cuts off 12 months back), so client state alone would
 * undercount what a cascade delete of a category destroys. The server
 * therefore supplies `preWindowEntryCounts` — entry totals for the months
 * *before* the loaded window — and this helper adds the live client-side sum
 * on top, so the result stays in sync with mid-session entry edits.
 *
 * Every month bucket in `spendingData` is summed, including pre-window
 * buckets created mid-session (e.g. by navigating far back): the app never
 * re-fetches historical months, so client state is always disjoint from the
 * rows behind the server totals. If a "load old month from the server" path
 * is ever added, that invariant breaks and a month boundary must be
 * reintroduced here to avoid double counting.
 */
export function countCategoryEntries(
    spendingData: Record<string, SpendingItem[]>,
    preWindowEntryCounts: Record<string, number>,
): Record<string, number> {

    const counts: Record<string, number> = { ...preWindowEntryCounts };

    for (const item of Object.values(spendingData).flat()) counts[item.categoryId] = (counts[item.categoryId] ?? 0) + (item.entries ?? []).length;

    return counts;
}
