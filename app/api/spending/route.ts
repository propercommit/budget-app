import { NextResponse } from "next/server";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import {
    flattenSpendingItem,
    spendingItemInclude,
    type SpendingItemWithSeries,
} from "@/lib/spending/flatten-item";

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_NAME_LENGTH = 100;
const MAX_AMOUNT_CENTS = 10_000_000_000; // = 100,000,000.00 major units; amounts are integer cents
const MIN_AMOUNT_CENTS = 0;
const MAX_NOTE_LENGTH = 500;

type FlatSpendingItem = ReturnType<typeof flattenSpendingItem>;

type GroupedSpendingItems = Record<string, FlatSpendingItem[]>;

export async function GET(request: Request) {
    try {
        const user = await getAuthenticatedUser();

        if (user === null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const month = searchParams.get("month");

        if (month !== null && !MONTH_REGEX.test(month)) {
            return NextResponse.json(
                { error: "Invalid month format. Use YYYY-MM (e.g., 2025-01)" },
                { status: 400 }
            );
        }

        const spendingItems: SpendingItemWithSeries[] = await prisma.spendingItem.findMany({
            where: {
                series: { userId: user.id },
                ...(month !== null && { month }),
            },
            include: spendingItemInclude,
            orderBy: { createdAt: "asc" },
        });

        const grouped: GroupedSpendingItems = {};
        for (const item of spendingItems) {
            if (grouped[item.month] === undefined) grouped[item.month] = [];

            grouped[item.month].push(flattenSpendingItem(item));
        }

        return NextResponse.json(grouped);
    } catch (error) {
        console.error("[Spending GET] Failed to fetch:", error);
        return NextResponse.json({ error: "Failed to fetch spending items" }, { status: 500 });
    }
}

/**
 * The structured 409 the create flow returns when the requested name already
 * belongs to a series: `series_active_this_month` when that series already has
 * an incarnation in the requested month, else `series_dormant` with the data
 * the client needs to offer an explicit Resume (D24 — no silent resume, no
 * duplicate names).
 */
async function seriesConflictResponse(
    series: { id: string; name: string; icon: string; categoryId: string; recurring: boolean },
    month: string
) {

    const incarnation = await prisma.spendingItem.findUnique({
        where: { seriesId_month: { seriesId: series.id, month } },
    });

    if (incarnation !== null) {
        return NextResponse.json({ error: "series_active_this_month" }, { status: 409 });
    }

    const latest = await prisma.spendingItem.findFirst({
        where: { seriesId: series.id },
        orderBy: { month: "desc" },
    });

    return NextResponse.json(
        {
            error: "series_dormant",
            series: {
                id: series.id,
                name: series.name,
                icon: series.icon,
                categoryId: series.categoryId,
                lastActiveMonth: latest?.month ?? null,
                lastBudgeted: latest?.budgeted ?? null,
                recurring: series.recurring,
            },
        },
        { status: 409 }
    );
}

export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser();

        if (user === null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { seriesId, name, icon, categoryId, recurring, month, budgeted, note } = body;

        // month is identity + partition (D18) — required on every create path.
        if (typeof month !== "string" || !MONTH_REGEX.test(month)) {
            return NextResponse.json(
                { error: "Month is required in YYYY-MM format (e.g., 2025-01)" },
                { status: 400 }
            );
        }

        if (recurring !== undefined && typeof recurring !== "boolean") {
            return NextResponse.json({ error: "Recurring must be a boolean" }, { status: 400 });
        }

        if (budgeted !== undefined) {
            if (typeof budgeted !== "number" || !Number.isFinite(budgeted)) {
                return NextResponse.json({ error: "Budgeted must be a valid number" }, { status: 400 });
            }
            if (budgeted < MIN_AMOUNT_CENTS || budgeted > MAX_AMOUNT_CENTS) {
                return NextResponse.json({ error: `Budgeted must be between ${MIN_AMOUNT_CENTS / 100} and ${(MAX_AMOUNT_CENTS / 100).toLocaleString()}` }, { status: 400 });
            }
        }

        if (note !== undefined && note !== null && note !== "") {
            if (typeof note !== "string") {
                return NextResponse.json({ error: "Note must be a string" }, { status: 400 });
            }
            if (note.length > MAX_NOTE_LENGTH) {
                return NextResponse.json({ error: `Note must be ${MAX_NOTE_LENGTH} characters or less` }, { status: 400 });
            }
        }

        // Resume/attach: create this month's incarnation of an existing series.
        if (seriesId !== undefined) {

            if (typeof seriesId !== "string" || seriesId === "") {
                return NextResponse.json({ error: "Series ID must be a non-empty string" }, { status: 400 });
            }

            const series = await prisma.budgetSeries.findFirst({
                where: { id: seriesId, userId: user.id },
            });

            if (series === null) {
                return NextResponse.json({ error: "Series not found" }, { status: 404 });
            }

            if (recurring !== undefined && recurring !== series.recurring) {
                await prisma.budgetSeries.update({
                    where: { id: series.id },
                    data: { recurring },
                });
            }

            try {
                const spendingItem: SpendingItemWithSeries = await prisma.spendingItem.create({
                    data: {
                        seriesId: series.id,
                        month,
                        budgeted: budgeted ?? 0,
                        note: typeof note === "string" && note !== "" ? note : null,
                    },
                    include: spendingItemInclude,
                });

                return NextResponse.json(flattenSpendingItem(spendingItem), { status: 201 });
            } catch (error) {
                // (seriesId, month) is unique — the series is already active this month.
                if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
                    return NextResponse.json({ error: "series_active_this_month" }, { status: 409 });
                }

                throw error;
            }
        }

        // New series + first incarnation.
        if (name === undefined || typeof name !== "string" || name.trim() === "") {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }
        if (name.trim().length > MAX_NAME_LENGTH) {
            return NextResponse.json({ error: `Name must be ${MAX_NAME_LENGTH} characters or less` }, { status: 400 });
        }

        if (typeof icon !== "string" || icon === "") {
            return NextResponse.json({ error: "Icon is required" }, { status: 400 });
        }

        if (typeof categoryId !== "string" || categoryId === "") {
            return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
        }

        const category = await prisma.category.findFirst({
            where: { id: categoryId, userId: user.id },
        });

        if (category === null) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }

        const trimmedName = name.trim();

        const existingSeries = await prisma.budgetSeries.findUnique({
            where: { userId_name: { userId: user.id, name: trimmedName } },
        });

        if (existingSeries !== null) return seriesConflictResponse(existingSeries, month);

        try {
            const spendingItem = await prisma.$transaction(async (tx) => {

                const series = await tx.budgetSeries.create({
                    data: {
                        name: trimmedName,
                        icon,
                        categoryId,
                        userId: user.id,
                        recurring: recurring ?? true,
                    },
                });

                return tx.spendingItem.create({
                    data: {
                        seriesId: series.id,
                        month,
                        budgeted: budgeted ?? 0,
                        note: typeof note === "string" && note !== "" ? note : null,
                    },
                    include: spendingItemInclude,
                });
            });

            return NextResponse.json(flattenSpendingItem(spendingItem), { status: 201 });
        } catch (error) {
            // Lost a create race on @@unique([userId, name]) — answer as if the
            // series had existed at the pre-check.
            if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {

                const racedSeries = await prisma.budgetSeries.findUnique({
                    where: { userId_name: { userId: user.id, name: trimmedName } },
                });

                if (racedSeries !== null) return seriesConflictResponse(racedSeries, month);
            }

            throw error;
        }
    } catch (error) {
        console.error("[Spending POST] Failed to create:", error);
        return NextResponse.json({ error: "Failed to create spending item" }, { status: 500 });
    }
}
