/** One point of a trend series — a month's label and its value in integer cents. */
export interface TrendDataPoint {
    label: string;
    value: number;
}

/** Headline stats for a trend series; amounts are integer cents, `change` is a percentage. */
export interface TrendStats {
    current: number;
    previous: number;
    /** Percent change vs the previous point; `null` when there is no previous point to compare against. */
    change: number | null;
}

/**
 * Headline stats for a trend series. A single point is real data — it becomes
 * `current` with `change: null` (nothing to compare against yet) rather than
 * being zeroed out; only an empty series yields all-zero amounts. `change`
 * stays `0` when the previous value is non-positive, since a percentage of a
 * non-positive base is undefined.
 */
export function getTrendStats(data: TrendDataPoint[]): TrendStats {

    if (data.length === 0) return { current: 0, previous: 0, change: null };

    const current = data[data.length - 1].value;

    if (data.length === 1) return { current, previous: 0, change: null };

    const previous = data[data.length - 2].value;
    const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;

    return { current, previous, change };
}
