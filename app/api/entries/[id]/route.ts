import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper function to recalculate spent amount
async function updateSpentAmount(spendingItemId: string) {
  const allEntries = await prisma.spendingEntry.findMany({
    where: { spendingItemId },
  });
  const newSpent = allEntries.reduce((sum, e) => sum + e.amount, 0);

  await prisma.spendingItem.update({
    where: { id: spendingItemId },
    data: { spent: newSpent },
  });
}

// PUT /api/entries/[id] - Update an entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get("x-user-id") || "temp-user";
    const body = await request.json();
    const { name, amount, receiptUrl, link } = body;

    // Find the entry and verify ownership through spending item
    const existingEntry = await prisma.spendingEntry.findUnique({
      where: { id },
      include: { spendingItem: true },
    });

    if (existingEntry === null) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      );
    }

    if (existingEntry.spendingItem.userId !== userId) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      );
    }

    // Update the entry
    const updatedEntry = await prisma.spendingEntry.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(amount !== undefined && { amount }),
        ...(receiptUrl !== undefined && { receiptUrl: receiptUrl || null }),
        ...(link !== undefined && { link: link || null }),
      },
    });

    // Recalculate spent amount if amount changed
    if (amount !== undefined) {
      await updateSpentAmount(existingEntry.spendingItemId);
    }

    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error("Failed to update entry:", error);
    return NextResponse.json(
      { error: "Failed to update entry" },
      { status: 500 }
    );
  }
}

// DELETE /api/entries/[id] - Delete an entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get("x-user-id") || "temp-user";

    // Find the entry and verify ownership through spending item
    const existingEntry = await prisma.spendingEntry.findUnique({
      where: { id },
      include: { spendingItem: true },
    });

    if (existingEntry === null) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      );
    }

    if (existingEntry.spendingItem.userId !== userId) {
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
    console.error("Failed to delete entry:", error);
    return NextResponse.json(
      { error: "Failed to delete entry" },
      { status: 500 }
    );
  }
}