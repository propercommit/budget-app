import { NextResponse } from "next/server";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import {
    flattenSpendingItem,
    spendingItemInclude,
    type SpendingItemWithSeries,
} from "@/lib/spending/flatten-item";

const MAX_NAME_LENGTH = 100;
const MAX_AMOUNT_CENTS = 10_000_000_000; // = 100,000,000.00 major units; amounts are integer cents
const MIN_AMOUNT_CENTS = 0;
const MAX_NOTE_LENGTH = 500;

/**
 * Updates split by ownership (D21): `name`/`icon`/`categoryId`/`recurring` live on the
 * series and editing them affects every month, past and future;
 * `budgeted`/`note` belong to this month's incarnation only. `month` is
 * identity + partition (D18) and is never editable — `month`, `startDate`,
 * `endDate` and `spent` in the body are ignored (`spent` is owned by the
 * entries recompute).
 */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();

        if (user === null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { name, icon, categoryId, recurring, budgeted, note } = body;

        if (
            name === undefined &&
            icon === undefined &&
            categoryId === undefined &&
            recurring === undefined &&
            budgeted === undefined &&
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

        // Validate recurring if provided
        if (recurring !== undefined && typeof recurring !== "boolean") {
            return NextResponse.json({ error: "Recurring must be a boolean" }, { status: 400 });
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

        // Validate note if provided (null clears it)
        if (note !== undefined && note !== null) {
            if (typeof note !== "string") {
                return NextResponse.json({ error: "Note must be a string" }, { status: 400 });
            }
            if (note.length > MAX_NOTE_LENGTH) {
                return NextResponse.json({ error: `Note must be ${MAX_NOTE_LENGTH} characters or less` }, { status: 400 });
            }
        }

        // Ownership is traversed through the series — items no longer carry a userId.
        const existing = await prisma.spendingItem.findFirst({
            where: { id, series: { userId: user.id } },
        });

        if (existing === null) {
            return NextResponse.json({ error: "Spending item not found" }, { status: 404 });
        }

        // If categoryId is being updated, verify it exists and belongs to user
        if (categoryId !== undefined) {
            const category = await prisma.category.findFirst({
                where: { id: categoryId, userId: user.id },
            });
            if (category === null) {
                return NextResponse.json({ error: "Category not found" }, { status: 404 });
            }
        }

        const seriesData: { name?: string; icon?: string; categoryId?: string; recurring?: boolean } = {};

        if (name !== undefined) seriesData.name = name.trim();

        if (icon !== undefined) seriesData.icon = icon;

        if (categoryId !== undefined) seriesData.categoryId = categoryId;

        if (recurring !== undefined) seriesData.recurring = recurring;

        const itemData: { budgeted?: number; note?: string | null } = {};

        if (budgeted !== undefined) itemData.budgeted = budgeted;

        if (note !== undefined) itemData.note = typeof note === "string" && note !== "" ? note : null;

        const spendingItem: SpendingItemWithSeries = await prisma.$transaction(async (tx) => {

            if (Object.keys(seriesData).length > 0) {
                await tx.budgetSeries.update({
                    where: { id: existing.seriesId },
                    data: seriesData,
                });
            }

            if (Object.keys(itemData).length > 0) {
                await tx.spendingItem.update({
                    where: { id },
                    data: itemData,
                });
            }

            return tx.spendingItem.findUniqueOrThrow({
                where: { id },
                include: spendingItemInclude,
            });
        });

        return NextResponse.json(flattenSpendingItem(spendingItem));
    } catch (error) {
        // Renaming a series collides globally on @@unique([userId, name]) — any
        // other series with that name, active or dormant, raises a P2002.
        if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json(
                { error: "You already have a budget item with this name" },
                { status: 409 }
            );
        }

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

        if (user === null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        if (typeof id !== "string" || id === "") {
            return NextResponse.json({ error: "Invalid spending item ID" }, { status: 400 });
        }

        const existing = await prisma.spendingItem.findFirst({
            where: { id, series: { userId: user.id } },
        });

        if (existing === null) {
            return NextResponse.json({ error: "Spending item not found" }, { status: 404 });
        }

        // Deletes this month's incarnation only. The series stays behind (possibly
        // dormant) — reactivating it is always an explicit user choice (D24).
        await prisma.spendingItem.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Spending DELETE] Failed to delete:", error);
        return NextResponse.json({ error: "Failed to delete spending item" }, { status: 500 });
    }
}
