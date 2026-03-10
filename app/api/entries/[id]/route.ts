import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

// Constants
const MAX_NAME_LENGTH = 100;
const MAX_AMOUNT = 100_000_000;
const MIN_AMOUNT = 0;
const MAX_LINK_LENGTH = 2048;
const MAX_RECEIPT_SIZE = 5_000_000; // ~5MB base64

// URL validation regex
const URL_REGEX = /^https?:\/\/.+/i;

/**
 * Recalculates and updates the spent amount for a spending item
 * based on the sum of all its entries.
 */
async function updateSpentAmount(spendingItemId: string): Promise<void> {
    const allEntries = await prisma.spendingEntry.findMany({
        where: { spendingItemId },
        select: { amount: true },
    });

    const newSpent = allEntries.reduce((sum, entry) => sum + entry.amount, 0);

    await prisma.spendingItem.update({
        where: { id: spendingItemId },
        data: { spent: newSpent },
    });
}

// PUT /api/entries/[id] - Update an entry
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;
        const body = await request.json();
        const { name, amount, receiptUrl, link, date } = body;

        // Validate at least one field is being updated
        if (
            name === undefined &&
            amount === undefined &&
            receiptUrl === undefined &&
            link === undefined &&
            date === undefined
        ) {
            return NextResponse.json(
                { error: "At least one field is required to update" },
                { status: 400 }
            );
        }

        // Validate name if provided
        if (name !== undefined) {
            if (typeof name !== "string" || name.trim() === "") {
                return NextResponse.json(
                    { error: "Name must be a non-empty string" },
                    { status: 400 }
                );
            }
            if (name.trim().length > MAX_NAME_LENGTH) {
                return NextResponse.json(
                    { error: `Name must be ${MAX_NAME_LENGTH} characters or less` },
                    { status: 400 }
                );
            }
        }

        // Validate amount if provided
        if (amount !== undefined) {
            if (typeof amount !== "number" || !Number.isFinite(amount)) {
                return NextResponse.json(
                    { error: "Amount must be a valid number" },
                    { status: 400 }
                );
            }
            if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
                return NextResponse.json(
                    { error: `Amount must be between ${MIN_AMOUNT} and ${MAX_AMOUNT.toLocaleString()}` },
                    { status: 400 }
                );
            }
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

        // Validate receiptUrl if provided
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

        // Find the entry and verify ownership through spending item
        const existingEntry = await prisma.spendingEntry.findUnique({
            where: { id },
            include: { spendingItem: true },
        });

        if (!existingEntry) {
            return NextResponse.json(
                { error: "Entry not found" },
                { status: 404 }
            );
        }

        if (existingEntry.spendingItem.userId !== user.id) {
            return NextResponse.json(
                { error: "Entry not found" },
                { status: 404 }
            );
        }

        // Build update data object
        const updateData: {
            name?: string;
            amount?: number;
            receiptUrl?: string | null;
            link?: string | null;
            date?: Date;
        } = {};

        if (name !== undefined) updateData.name = name.trim();
        if (amount !== undefined) updateData.amount = amount;
        if (receiptUrl !== undefined) updateData.receiptUrl = receiptUrl || null;
        if (link !== undefined) updateData.link = link || null;
        if (date !== undefined) updateData.date = new Date(date);

        // Update the entry
        const updatedEntry = await prisma.spendingEntry.update({
            where: { id },
            data: updateData,
        });

        // Recalculate spent amount if amount changed
        if (amount !== undefined) {
            await updateSpentAmount(existingEntry.spendingItemId);
        }

        return NextResponse.json(updatedEntry);
    } catch (error) {
        console.error("[Entries PUT] Failed to update:", error);
        return NextResponse.json(
            { error: "Failed to update entry" },
            { status: 500 }
        );
    }
}

// DELETE /api/entries/[id] - Delete an entry
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;

        // Validate id
        if (!id || typeof id !== "string") {
            return NextResponse.json(
                { error: "Invalid entry ID" },
                { status: 400 }
            );
        }

        // Find the entry and verify ownership through spending item
        const existingEntry = await prisma.spendingEntry.findUnique({
            where: { id },
            include: { spendingItem: true },
        });

        if (!existingEntry) {
            return NextResponse.json(
                { error: "Entry not found" },
                { status: 404 }
            );
        }

        if (existingEntry.spendingItem.userId !== user.id) {
            return NextResponse.json(
                { error: "Entry not found" },
                { status: 404 }
            );
        }

        const spendingItemId = existingEntry.spendingItemId;

        // Delete the entry
        await prisma.spendingEntry.delete({
            where: { id },
        });

        // Recalculate spent amount
        await updateSpentAmount(spendingItemId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Entries DELETE] Failed to delete:", error);
        return NextResponse.json(
            { error: "Failed to delete entry" },
            { status: 500 }
        );
    }
}