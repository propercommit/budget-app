import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/supabase-server";

// Constants
const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_NAME_LENGTH = 100;
const MAX_AMOUNT = 100_000_000;
const MIN_AMOUNT = 0;

// Types
type SpendingItemWithEntries = {
    id: string;
    name: string;
    icon: string;
    budgeted: number;
    spent: number;
    month: string;
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

// GET /api/spending - Fetch all spending items or filter by month
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
        const month = searchParams.get("month");

        // Validate month format if provided
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

        // Transform spendingEntries to entries for frontend compatibility
        const transformedItems: SpendingItemWithEntries[] = spendingItems.map(item => ({
            ...item,
            entries: item.spendingEntries,
        }));

        // Group items by month
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
        return NextResponse.json(
            { error: "Failed to fetch spending items" },
            { status: 500 }
        );
    }
}

// POST /api/spending - Create a new spending item
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
        const { name, icon, categoryId, budgeted, spent, month } = body;

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

        // Validate icon
        if (!icon || typeof icon !== "string" || icon === "") {
            return NextResponse.json(
                { error: "Icon is required" },
                { status: 400 }
            );
        }

        // Validate categoryId
        if (!categoryId || typeof categoryId !== "string") {
            return NextResponse.json(
                { error: "Category ID is required" },
                { status: 400 }
            );
        }

        // Validate month
        if (!month || typeof month !== "string") {
            return NextResponse.json(
                { error: "Month is required" },
                { status: 400 }
            );
        }

        if (!MONTH_REGEX.test(month)) {
            return NextResponse.json(
                { error: "Invalid month format. Use YYYY-MM (e.g., 2025-01)" },
                { status: 400 }
            );
        }

        // Validate budgeted if provided
        if (budgeted !== undefined) {
            if (typeof budgeted !== "number" || !Number.isFinite(budgeted)) {
                return NextResponse.json(
                    { error: "Budgeted must be a valid number" },
                    { status: 400 }
                );
            }
            if (budgeted < MIN_AMOUNT || budgeted > MAX_AMOUNT) {
                return NextResponse.json(
                    { error: `Budgeted must be between ${MIN_AMOUNT} and ${MAX_AMOUNT.toLocaleString()}` },
                    { status: 400 }
                );
            }
        }

        // Validate spent if provided
        if (spent !== undefined) {
            if (typeof spent !== "number" || !Number.isFinite(spent)) {
                return NextResponse.json(
                    { error: "Spent must be a valid number" },
                    { status: 400 }
                );
            }
            if (spent < MIN_AMOUNT || spent > MAX_AMOUNT) {
                return NextResponse.json(
                    { error: `Spent must be between ${MIN_AMOUNT} and ${MAX_AMOUNT.toLocaleString()}` },
                    { status: 400 }
                );
            }
        }

        // Verify category exists and belongs to user
        const category = await prisma.category.findFirst({
            where: { id: categoryId, userId: user.id },
        });

        if (!category) {
            return NextResponse.json(
                { error: "Category not found" },
                { status: 404 }
            );
        }

        // Create the spending item
        const spendingItem = await prisma.spendingItem.create({
            data: {
                name: name.trim(),
                icon,
                budgeted: budgeted ?? 0,
                spent: spent ?? 0,
                month,
                userId: user.id,
                categoryId,
            },
            include: {
                category: true,
                spendingEntries: true,
            },
        });

        // Transform for frontend compatibility
        const response = {
            ...spendingItem,
            entries: spendingItem.spendingEntries,
        };

        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        console.error("[Spending POST] Failed to create:", error);
        return NextResponse.json(
            { error: "Failed to create spending item" },
            { status: 500 }
        );
    }
}