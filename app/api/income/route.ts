import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/supabase-server";

// Constants
const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_INCOME_AMOUNT = 100_000_000; // 100 million
const MIN_INCOME_AMOUNT = 0;

// Type for grouped income response
type GroupedIncome = Record<string, {
    id: string;
    month: string;
    active: number;
    passive: number;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}>;

// GET /api/income - Fetch all income records or specific month
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

        if (month) {
            // Get income for a specific month
            const income = await prisma.monthlyIncome.findUnique({
                where: {
                    userId_month: { userId: user.id, month },
                },
            });

            return NextResponse.json(income || { active: 0, passive: 0, month });
        }

        // Get all income records for the user
        const incomes = await prisma.monthlyIncome.findMany({
            where: { userId: user.id },
            orderBy: { month: "asc" },
        });

        const grouped: GroupedIncome = {};
        for (const item of incomes) {
            grouped[item.month] = item;
        }

        return NextResponse.json(grouped);
    } catch (error) {
        console.error("[Income GET] Failed to fetch:", error);
        return NextResponse.json(
            { error: "Failed to fetch income" },
            { status: 500 }
        );
    }
}

// POST /api/income - Create or update income for a month
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
        const { month, active, passive } = body;

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

        // Validate active income if provided
        if (active !== undefined) {
            if (typeof active !== "number" || !Number.isFinite(active)) {
                return NextResponse.json(
                    { error: "Active income must be a valid number" },
                    { status: 400 }
                );
            }
            if (active < MIN_INCOME_AMOUNT || active > MAX_INCOME_AMOUNT) {
                return NextResponse.json(
                    { error: `Active income must be between ${MIN_INCOME_AMOUNT} and ${MAX_INCOME_AMOUNT.toLocaleString()}` },
                    { status: 400 }
                );
            }
        }

        // Validate passive income if provided
        if (passive !== undefined) {
            if (typeof passive !== "number" || !Number.isFinite(passive)) {
                return NextResponse.json(
                    { error: "Passive income must be a valid number" },
                    { status: 400 }
                );
            }
            if (passive < MIN_INCOME_AMOUNT || passive > MAX_INCOME_AMOUNT) {
                return NextResponse.json(
                    { error: `Passive income must be between ${MIN_INCOME_AMOUNT} and ${MAX_INCOME_AMOUNT.toLocaleString()}` },
                    { status: 400 }
                );
            }
        }

        // Ensure user exists in our database
        await prisma.user.upsert({
            where: { id: user.id },
            update: { email: user.email ?? undefined },
            create: {
                id: user.id,
                email: user.email ?? `${user.id}@unknown.com`,
            },
        });

        // Build update data
        const updateData: { active?: number; passive?: number } = {};
        if (active !== undefined) updateData.active = active;
        if (passive !== undefined) updateData.passive = passive;

        // Create or update income
        const income = await prisma.monthlyIncome.upsert({
            where: {
                userId_month: { userId: user.id, month },
            },
            update: updateData,
            create: {
                month,
                active: active ?? 0,
                passive: passive ?? 0,
                userId: user.id,
            },
        });

        return NextResponse.json(income);
    } catch (error) {
        console.error("[Income POST] Failed to save:", error);
        return NextResponse.json(
            { error: "Failed to save income" },
            { status: 500 }
        );
    }
}