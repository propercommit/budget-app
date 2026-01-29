import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/spending?month=2025-01 - Fetch spending items for a month
// GET /api/spending?month=2025-01 - Fetch spending items for a month
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "temp-user";
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    const spendingItems = await prisma.spendingItem.findMany({
      where: {
        userId,
        ...(month && { month }),
      },
      include: {
        category: true,
        spendingEntries: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Transform spendingEntries to entries for frontend compatibility
    const transformedItems = spendingItems.map(item => ({
      ...item,
      entries: item.spendingEntries,
      spendingEntries: undefined,
    }));

    const grouped: Record<string, typeof transformedItems> = {};
    
    for (const item of transformedItems) {
      const month = item.month;

      if(grouped[month] === undefined) grouped[month] = [];
      
      grouped[month].push(item);
    }

    return NextResponse.json(grouped);
  } catch (error) {
    console.error("Failed to fetch spending items:", error);
    return NextResponse.json(
      { error: "Failed to fetch spending items" },
      { status: 500 }
    );
  }
}

// POST /api/spending - Create a new spending item
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "temp-user";
    const body = await request.json();
    const { name, icon, categoryId, budgeted, spent, month } = body;

    // Validate required fields
    if (!name || !icon || !categoryId || !month) {
      return NextResponse.json(
        { error: "Missing required fields: name, icon, categoryId, month" },
        { status: 400 }
      );
    }

    // Verify category exists and belongs to user
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId },
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
        name,
        icon,
        budgeted: budgeted || 0,
        spent: spent || 0,
        month,
        userId,
        categoryId,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(spendingItem, { status: 201 });
  } catch (error) {
    console.error("Failed to create spending item:", error);
    return NextResponse.json(
      { error: "Failed to create spending item" },
      { status: 500 }
    );
  }
}