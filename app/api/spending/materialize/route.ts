import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import {
    flattenSpendingItem,
    spendingItemInclude,
    type SpendingItemWithSeries,
} from "@/lib/spending/flatten-item";

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Lazy materialization (D22): gives every active recurring series an
 * incarnation in the requested month, then returns the month's full item
 * list, flattened.
 *
 * Idempotent by construction — the missing-series query plus the upsert on
 * `(seriesId, month)` mean a double call creates nothing twice, and a month
 * already holding some incarnations still receives the rest. Series with
 * `recurring: false` are never materialized, and nothing is ever deleted
 * here (toggling recurring off only stops future materialization).
 *
 * A materialized incarnation inherits `budgeted` from the series' latest
 * existing incarnation (D23) and starts with no entries, so `spent` is 0.
 */
export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser();

        if (user === null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { month } = body;

        if (typeof month !== "string" || !MONTH_REGEX.test(month)) {
            return NextResponse.json(
                { error: "Month is required in YYYY-MM format (e.g., 2025-01)" },
                { status: 400 }
            );
        }

        const missingSeries = await prisma.budgetSeries.findMany({
            where: {
                userId: user.id,
                recurring: true,
                items: { none: { month } },
            },
            include: {
                // Latest incarnation, for budget inheritance (D23). Lexicographic
                // order is chronological because months are zero-padded YYYY-MM.
                items: { orderBy: { month: "desc" }, take: 1 },
            },
        });

        if (missingSeries.length > 0) {
            await prisma.spendingItem.createMany({
                data: missingSeries.map((series) => ({
                    seriesId: series.id,
                    month,
                    budgeted: series.items[0]?.budgeted ?? 0,
                })),
                // The query above already excluded incarnated series; this only
                // covers a concurrent double call racing on (seriesId, month).
                skipDuplicates: true,
            });
        }

        const items: SpendingItemWithSeries[] = await prisma.spendingItem.findMany({
            where: { series: { userId: user.id }, month },
            include: spendingItemInclude,
            orderBy: { createdAt: "asc" },
        });

        return NextResponse.json(items.map(flattenSpendingItem));
    } catch (error) {
        console.error("[Spending materialize] Failed:", error);
        return NextResponse.json({ error: "Failed to materialize month" }, { status: 500 });
    }
}
