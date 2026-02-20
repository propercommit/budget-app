import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/supabase-server";

const MAX_NAME_LENGTH = 100;
const MAX_AMOUNT = 100_000_000;
const MIN_AMOUNT = 0;
const MAX_NOTE_LENGTH = 500;

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { name, icon, categoryId, budgeted, spent, startDate, endDate, note } = body;

        if (
            name === undefined &&
            icon === undefined &&
            categoryId === undefined &&
            budgeted === undefined &&
            spent === undefined &&
            startDate === undefined &&
            endDate === undefined &&
            note === undefined
        ) {
            return NextResponse.json({ error: "At least one field is required to update" }, { status: 400 });
        }

        // Validate name if provided
        if (name !== undefined) {
            if (typeof name !== "string" || name.trim() === "") {
                return NextResponse.json({ error: "Name must be a non-empty string" }, { status: 400 });
            }
            if (name.trim().length > MAX_NAME_LENGTH) {
                return NextResponse.json({ error: `Name must be ${MAX_NAME_LENGTH} characters or less` }, { status: 400 });
            }
        }

        // Validate icon if provided
        if (icon !== undefined && (typeof icon !== "string" || icon === "")) {
            return NextResponse.json({ error: "Icon must be a non-empty string" }, { status: 400 });
        }

        // Validate categoryId if provided
        if (categoryId !== undefined && typeof categoryId !== "string") {
            return NextResponse.json({ error: "Category ID must be a string" }, { status: 400 });
        }

        // Validate budgeted if provided
        if (budgeted !== undefined) {
            if (typeof budgeted !== "number" || !Number.isFinite(budgeted)) {
                return NextResponse.json({ error: "Budgeted must be a valid number" }, { status: 400 });
            }
            if (budgeted < MIN_AMOUNT || budgeted > MAX_AMOUNT) {
                return NextResponse.json({ error: `Budgeted must be between ${MIN_AMOUNT} and ${MAX_AMOUNT.toLocaleString()}` }, { status: 400 });
            }
        }

        // Validate spent if provided
        if (spent !== undefined) {
            if (typeof spent !== "number" || !Number.isFinite(spent)) {
                return NextResponse.json({ error: "Spent must be a valid number" }, { status: 400 });
            }
            if (spent < MIN_AMOUNT || spent > MAX_AMOUNT) {
                return NextResponse.json({ error: `Spent must be between ${MIN_AMOUNT} and ${MAX_AMOUNT.toLocaleString()}` }, { status: 400 });
            }
        }

        // Validate startDate if provided
        let parsedStartDate: Date | undefined;
        if (startDate !== undefined) {
            if (typeof startDate !== "string") {
                return NextResponse.json({ error: "Start date must be a string" }, { status: 400 });
            }
            parsedStartDate = new Date(startDate);
            if (isNaN(parsedStartDate.getTime())) {
                return NextResponse.json({ error: "Start date must be a valid date" }, { status: 400 });
            }
        }

        // Validate endDate if provided (null clears it)
        let parsedEndDate: Date | null | undefined;
        if (endDate !== undefined) {
            if (endDate === null || endDate === "") {
                parsedEndDate = null;
            } else {
                if (typeof endDate !== "string") {
                    return NextResponse.json({ error: "End date must be a string or null" }, { status: 400 });
                }
                parsedEndDate = new Date(endDate);
                if (isNaN(parsedEndDate.getTime())) {
                    return NextResponse.json({ error: "End date must be a valid date" }, { status: 400 });
                }
            }
        }

        // Validate note if provided (null clears it)
        if (note !== undefined && note !== null) {
            if (typeof note !== "string") {
                return NextResponse.json({ error: "Note must be a string" }, { status: 400 });
            }
            if (note.length > MAX_NOTE_LENGTH) {
                return NextResponse.json({ error: `Note must be ${MAX_NOTE_LENGTH} characters or less` }, { status: 400 });
            }
        }

        // Check if spending item exists and belongs to user
        const existing = await prisma.spendingItem.findFirst({
            where: { id, userId: user.id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Spending item not found" }, { status: 404 });
        }

        // If categoryId is being updated, verify it exists and belongs to user
        if (categoryId) {
            const category = await prisma.category.findFirst({
                where: { id: categoryId, userId: user.id },
            });
            if (!category) {
                return NextResponse.json({ error: "Category not found" }, { status: 404 });
            }
        }

        // Build update data
        const updateData: {
            name?: string;
            icon?: string;
            categoryId?: string;
            budgeted?: number;
            spent?: number;
            startDate?: Date;
            endDate?: Date | null;
            note?: string | null;
            month?: string;
        } = {};

        if (name !== undefined) updateData.name = name.trim();
        if (icon !== undefined) updateData.icon = icon;
        if (categoryId !== undefined) updateData.categoryId = categoryId;
        if (budgeted !== undefined) updateData.budgeted = budgeted;
        if (spent !== undefined) updateData.spent = spent;
        if (parsedStartDate !== undefined) {
            updateData.startDate = parsedStartDate;
            updateData.month = `${parsedStartDate.getFullYear()}-${String(parsedStartDate.getMonth() + 1).padStart(2, "0")}`;
        }
        if (parsedEndDate !== undefined) updateData.endDate = parsedEndDate;
        if (note !== undefined) updateData.note = note || null;

        const spendingItem = await prisma.spendingItem.update({
            where: { id },
            data: updateData,
            include: {
                category: true,
                spendingEntries: true,
            },
        });

        const response = {
            ...spendingItem,
            entries: spendingItem.spendingEntries,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("[Spending PUT] Failed to update:", error);
        return NextResponse.json({ error: "Failed to update spending item" }, { status: 500 });
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        if (!id || typeof id !== "string") {
            return NextResponse.json({ error: "Invalid spending item ID" }, { status: 400 });
        }

        const existing = await prisma.spendingItem.findFirst({
            where: { id, userId: user.id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Spending item not found" }, { status: 404 });
        }

        await prisma.spendingItem.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Spending DELETE] Failed to delete:", error);
        return NextResponse.json({ error: "Failed to delete spending item" }, { status: 500 });
    }
}