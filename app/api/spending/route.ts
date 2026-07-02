import { NextResponse } from "next/server";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_NAME_LENGTH = 100;
const MAX_AMOUNT_CENTS = 10_000_000_000; // = 100,000,000.00 major units; amounts are integer cents
const MIN_AMOUNT_CENTS = 0;
const MAX_NOTE_LENGTH = 500;

type SpendingItemWithEntries = {
    id: string;
    name: string;
    icon: string;
    budgeted: number;
    spent: number;
    month: string;
    startDate: Date;
    endDate: Date | null;
    note: string | null;
    userId: string;
    categoryId: string;
    category: {
        id: string;
        label: string;
        icon: string;
        color: string;
    } | null;
    entries: Array<{
        id: string;
        name: string;
        amount: number;
        receiptUrl: string | null;
        link: string | null;
        date: Date;
        spendingItemId: string;
    }>;
    createdAt: Date;
    updatedAt: Date;
};

type GroupedSpendingItems = Record<string, SpendingItemWithEntries[]>;

export async function GET(request: Request) {
    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const month = searchParams.get("month");

        if (month && !MONTH_REGEX.test(month)) {
            return NextResponse.json(
                { error: "Invalid month format. Use YYYY-MM (e.g., 2025-01)" },
                { status: 400 }
            );
        }

        const spendingItems = await prisma.spendingItem.findMany({
            where: {
                userId: user.id,
                ...(month && { month }),
            },
            include: {
                category: true,
                spendingEntries: true,
            },
            orderBy: { createdAt: "asc" },
        });

        const transformedItems: SpendingItemWithEntries[] = spendingItems.map(item => ({
            ...item,
            entries: item.spendingEntries,
        }));

        const grouped: GroupedSpendingItems = {};
        for (const item of transformedItems) {
            const itemMonth = item.month;
            if (grouped[itemMonth] === undefined) {
                grouped[itemMonth] = [];
            }
            grouped[itemMonth].push(item);
        }

        return NextResponse.json(grouped);
    } catch (error) {
        console.error("[Spending GET] Failed to fetch:", error);
        return NextResponse.json({ error: "Failed to fetch spending items" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, icon, categoryId, budgeted, spent, startDate, endDate, note } = body;

        // Validate name
        if (!name || typeof name !== "string" || name.trim() === "") {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }
        if (name.trim().length > MAX_NAME_LENGTH) {
            return NextResponse.json({ error: `Name must be ${MAX_NAME_LENGTH} characters or less` }, { status: 400 });
        }

        // Validate icon
        if (!icon || typeof icon !== "string" || icon === "") {
            return NextResponse.json({ error: "Icon is required" }, { status: 400 });
        }

        // Validate categoryId
        if (!categoryId || typeof categoryId !== "string") {
            return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
        }

        // Validate startDate
        if (!startDate || typeof startDate !== "string") {
            return NextResponse.json({ error: "Start date is required" }, { status: 400 });
        }
        const parsedStartDate = new Date(startDate);
        if (isNaN(parsedStartDate.getTime())) {
            return NextResponse.json({ error: "Start date must be a valid date" }, { status: 400 });
        }

        // Validate endDate if provided
        let parsedEndDate: Date | null = null;
        if (endDate && typeof endDate === "string") {
            parsedEndDate = new Date(endDate);
            if (isNaN(parsedEndDate.getTime())) {
                return NextResponse.json({ error: "End date must be a valid date" }, { status: 400 });
            }
            if (parsedEndDate <= parsedStartDate) {
                return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
            }
        }

        // Validate note if provided
        if (note !== undefined && note !== null && note !== "") {
            if (typeof note !== "string") {
                return NextResponse.json({ error: "Note must be a string" }, { status: 400 });
            }
            if (note.length > MAX_NOTE_LENGTH) {
                return NextResponse.json({ error: `Note must be ${MAX_NOTE_LENGTH} characters or less` }, { status: 400 });
            }
        }

        // Validate budgeted if provided
        if (budgeted !== undefined) {
            if (typeof budgeted !== "number" || !Number.isFinite(budgeted)) {
                return NextResponse.json({ error: "Budgeted must be a valid number" }, { status: 400 });
            }
            if (budgeted < MIN_AMOUNT_CENTS || budgeted > MAX_AMOUNT_CENTS) {
                return NextResponse.json({ error: `Budgeted must be between ${MIN_AMOUNT_CENTS / 100} and ${(MAX_AMOUNT_CENTS / 100).toLocaleString()}` }, { status: 400 });
            }
        }

        // Validate spent if provided — signed: credits can push a card's spent
        // negative (see lib/spending/math.ts), so only the magnitude is capped
        if (spent !== undefined) {
            if (typeof spent !== "number" || !Number.isFinite(spent)) {
                return NextResponse.json({ error: "Spent must be a valid number" }, { status: 400 });
            }
            if (spent < -MAX_AMOUNT_CENTS || spent > MAX_AMOUNT_CENTS) {
                return NextResponse.json({ error: `Spent must be between ${(-MAX_AMOUNT_CENTS / 100).toLocaleString()} and ${(MAX_AMOUNT_CENTS / 100).toLocaleString()}` }, { status: 400 });
            }
        }

        // Verify category exists and belongs to user
        const category = await prisma.category.findFirst({
            where: { id: categoryId, userId: user.id },
        });

        if (!category) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }

        // Derive month from startDate
        const month = `${parsedStartDate.getFullYear()}-${String(parsedStartDate.getMonth() + 1).padStart(2, "0")}`;

        const spendingItem = await prisma.spendingItem.create({
            data: {
                name: name.trim(),
                icon,
                budgeted: budgeted ?? 0,
                spent: spent ?? 0,
                month,
                startDate: parsedStartDate,
                endDate: parsedEndDate,
                note: note || null,
                userId: user.id,
                categoryId,
            },
            include: {
                category: true,
                spendingEntries: true,
            },
        });

        const response = {
            ...spendingItem,
            entries: spendingItem.spendingEntries,
        };

        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        // Duplicate (userId, name, month) violates @@unique — surface a friendly
        // 409 instead of a generic 500 so the client can show "already exists".
        if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json(
                { error: "A spending item with this name already exists for this month" },
                { status: 409 }
            );
        }

        console.error("[Spending POST] Failed to create:", error);
        return NextResponse.json({ error: "Failed to create spending item" }, { status: 500 });
    }
}