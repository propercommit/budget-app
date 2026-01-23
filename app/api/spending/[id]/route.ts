import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT /api/spending/[id] - Update a spending item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get("x-user-id") || "temp-user";
    const body = await request.json();
    const { name, icon, categoryId, budgeted, spent } = body;

    // Check if spending item exists and belongs to user
    const existing = await prisma.spendingItem.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Spending item not found" },
        { status: 404 }
      );
    }

    // If categoryId is being updated, verify it exists
    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, userId },
      });

      if (!category) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 }
        );
      }
    }

    // Update the spending item
    const spendingItem = await prisma.spendingItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(icon !== undefined && { icon }),
        ...(categoryId !== undefined && { categoryId }),
        ...(budgeted !== undefined && { budgeted }),
        ...(spent !== undefined && { spent }),
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(spendingItem);
  } catch (error) {
    console.error("Failed to update spending item:", error);
    return NextResponse.json(
      { error: "Failed to update spending item" },
      { status: 500 }
    );
  }
}

// DELETE /api/spending/[id] - Delete a spending item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get("x-user-id") || "temp-user";

    // Check if spending item exists and belongs to user
    const existing = await prisma.spendingItem.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Spending item not found" },
        { status: 404 }
      );
    }

    // Delete the spending item
    await prisma.spendingItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete spending item:", error);
    return NextResponse.json(
      { error: "Failed to delete spending item" },
      { status: 500 }
    );
  }
}