import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { updateSpentAmount } from "@/lib/spending/update-spent";
import { monthOfDate } from "@/lib/spending/month";
import { flattenSpendingItem, spendingItemInclude } from "@/lib/spending/flatten-item";

// Constants
const MAX_NAME_LENGTH = 100;
const MAX_AMOUNT_CENTS = 10_000_000_000; // = 100,000,000.00 major units; amounts are integer cents
const MIN_AMOUNT_CENTS = 0; // entry amounts are positive magnitudes; sign comes from `direction`
const MAX_LINK_LENGTH = 2048;
const MAX_RECEIPT_SIZE = 5_000_000; // ~5MB base64

// URL validation regex (basic)
const URL_REGEX = /^https?:\/\/.+/i;

// GET /api/entries - Fetch entries for a spending item
export async function GET(request: Request) {
    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const spendingItemId = searchParams.get("spendingItemId");

        // Validate spendingItemId
        if (!spendingItemId || spendingItemId.trim() === "") {
            return NextResponse.json(
                { error: "spendingItemId is required" },
                { status: 400 }
            );
        }

        // Verify the spending item belongs to this user (ownership lives on the series)
        const spendingItem = await prisma.spendingItem.findFirst({
            where: { id: spendingItemId, series: { userId: user.id } },
        });

        if (!spendingItem) {
            return NextResponse.json(
                { error: "Spending item not found" },
                { status: 404 }
            );
        }

        const entries = await prisma.spendingEntry.findMany({
            where: { spendingItemId },
            orderBy: { date: "desc" },
        });

        return NextResponse.json(entries);
    } catch (error) {
        console.error("[Entries GET] Failed to fetch:", error);
        return NextResponse.json(
            { error: "Failed to fetch entries" },
            { status: 500 }
        );
    }
}

// POST /api/entries - Create a new entry
export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { spendingItemId, name, amount, direction, receiptUrl, link, date } = body;

        // Validate spendingItemId
        if (!spendingItemId || typeof spendingItemId !== "string") {
            return NextResponse.json(
                { error: "spendingItemId is required" },
                { status: 400 }
            );
        }

        // Validate name
        if (!name || typeof name !== "string" || name.trim() === "") {
            return NextResponse.json(
                { error: "Name is required" },
                { status: 400 }
            );
        }

        if (name.trim().length > MAX_NAME_LENGTH) {
            return NextResponse.json(
                { error: `Name must be ${MAX_NAME_LENGTH} characters or less` },
                { status: 400 }
            );
        }

        // Validate amount
        if (amount === undefined || amount === null) {
            return NextResponse.json(
                { error: "Amount is required" },
                { status: 400 }
            );
        }

        if (typeof amount !== "number" || !Number.isFinite(amount)) {
            return NextResponse.json(
                { error: "Amount must be a valid number" },
                { status: 400 }
            );
        }

        if (amount < MIN_AMOUNT_CENTS || amount > MAX_AMOUNT_CENTS) {
            return NextResponse.json(
                { error: `Amount must be between ${MIN_AMOUNT_CENTS / 100} and ${(MAX_AMOUNT_CENTS / 100).toLocaleString()}` },
                { status: 400 }
            );
        }

        // Validate direction if provided (absent defaults to "debit")
        if (direction !== undefined && direction !== "debit" && direction !== "credit") {
            return NextResponse.json(
                { error: 'Direction must be "debit" or "credit"' },
                { status: 400 }
            );
        }

        // Validate link if provided
        if (link !== undefined && link !== null && link !== "") {
            if (typeof link !== "string") {
                return NextResponse.json(
                    { error: "Link must be a string" },
                    { status: 400 }
                );
            }
            if (link.length > MAX_LINK_LENGTH) {
                return NextResponse.json(
                    { error: `Link must be ${MAX_LINK_LENGTH} characters or less` },
                    { status: 400 }
                );
            }
            if (!URL_REGEX.test(link)) {
                return NextResponse.json(
                    { error: "Link must be a valid URL starting with http:// or https://" },
                    { status: 400 }
                );
            }
        }

        // Validate receiptUrl if provided (base64 image)
        if (receiptUrl !== undefined && receiptUrl !== null && receiptUrl !== "") {
            if (typeof receiptUrl !== "string") {
                return NextResponse.json(
                    { error: "Receipt URL must be a string" },
                    { status: 400 }
                );
            }
            if (receiptUrl.length > MAX_RECEIPT_SIZE) {
                return NextResponse.json(
                    { error: "Receipt image is too large. Maximum size is approximately 5MB" },
                    { status: 400 }
                );
            }
        }

        // Validate date if provided
        if (date !== undefined && date !== null) {
            if (typeof date !== "string") {
                return NextResponse.json(
                    { error: "Date must be a string" },
                    { status: 400 }
                );
            }
            const parsedDate = new Date(date);
            if (isNaN(parsedDate.getTime())) {
                return NextResponse.json(
                    { error: "Date must be a valid date string" },
                    { status: 400 }
                );
            }
        }

        // Verify the spending item belongs to this user (ownership lives on the series)
        const spendingItem = await prisma.spendingItem.findFirst({
            where: { id: spendingItemId, series: { userId: user.id } },
        });

        if (!spendingItem) {
            return NextResponse.json(
                { error: "Spending item not found" },
                { status: 404 }
            );
        }

        const entryDate = date ? new Date(date) : new Date();
        const targetMonth = monthOfDate(entryDate);

        const entryData = {
            name: name.trim(),
            amount,
            direction: (direction ?? "debit") as "debit" | "credit",
            receiptUrl: receiptUrl || null,
            link: link || null,
            date: entryDate,
        };

        // Same month as the addressed item: attach directly, as always.
        if (targetMonth === spendingItem.month) {
            const entry = await prisma.spendingEntry.create({
                data: { ...entryData, spendingItemId },
            });

            // Recompute the item's spent as the signed sum of its entries
            await updateSpentAmount(spendingItemId);

            return NextResponse.json(entry, { status: 201 });
        }

        // An entry belongs to the month of its date (D19): route it to that
        // month's incarnation of the same series — creating one at budgeted 0
        // if the series isn't incarnated there yet (D23) — atomically with the
        // spent recompute. The addressed item never receives the entry, but is
        // returned too so the client can roll back its optimistic patch.
        const routed = await prisma.$transaction(async (tx) => {

            const target = await tx.spendingItem.upsert({
                where: { seriesId_month: { seriesId: spendingItem.seriesId, month: targetMonth } },
                update: {},
                create: { seriesId: spendingItem.seriesId, month: targetMonth, budgeted: 0 },
            });

            const entry = await tx.spendingEntry.create({
                data: { ...entryData, spendingItemId: target.id },
            });

            await updateSpentAmount(target.id, tx);

            const sourceItem = await tx.spendingItem.findUniqueOrThrow({
                where: { id: spendingItemId },
                include: spendingItemInclude,
            });

            const targetItem = await tx.spendingItem.findUniqueOrThrow({
                where: { id: target.id },
                include: spendingItemInclude,
            });

            return { entry, sourceItem, targetItem };
        });

        return NextResponse.json(
            {
                entry: routed.entry,
                sourceItem: flattenSpendingItem(routed.sourceItem),
                targetItem: flattenSpendingItem(routed.targetItem),
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("[Entries POST] Failed to create:", error);
        return NextResponse.json(
            { error: "Failed to create entry" },
            { status: 500 }
        );
    }
}