import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/entries?spendingItemId=xxx - Fetch entries for a spending item
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "temp-user";
    const { searchParams } = new URL(request.url);
    const spendingItemId = searchParams.get("spendingItemId");

    if (spendingItemId === null || spendingItemId === "") {
      return NextResponse.json(
        { error: "spendingItemId is required" },
        { status: 400 }
      );
    }

    // Verify the spending item belongs to this user
    const spendingItem = await prisma.spendingItem.findFirst({
      where: { id: spendingItemId, userId },
    });

    if (spendingItem === null) {
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
    console.error("Failed to fetch entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch entries" },
      { status: 500 }
    );
  }
}

// POST /api/entries - Create a new entry
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "temp-user";
    const body = await request.json();
    const { spendingItemId, name, amount, receiptUrl, link } = body;

    // Validate required fields
    if (spendingItemId === undefined || spendingItemId === null || spendingItemId === "") {
      return NextResponse.json(
        { error: "spendingItemId is required" },
        { status: 400 }
      );
    }

    if (name === undefined || name === null || name === "") {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    if (amount === undefined || amount === null) {
      return NextResponse.json(
        { error: "amount is required" },
        { status: 400 }
      );
    }

    // Verify the spending item belongs to this user
    const spendingItem = await prisma.spendingItem.findFirst({
      where: { id: spendingItemId, userId },
    });

    if (spendingItem === null) {
      return NextResponse.json(
        { error: "Spending item not found" },
        { status: 404 }
      );
    }

    // Create the entry
    const entry = await prisma.spendingEntry.create({
      data: {
        name,
        amount,
        receiptUrl: receiptUrl || null,
        link: link || null,
        spendingItemId,
      },
    });

    // Update the spent amount on the spending item
    const allEntries = await prisma.spendingEntry.findMany({
      where: { spendingItemId },
    });
    const newSpent = allEntries.reduce((sum, e) => sum + e.amount, 0);

    await prisma.spendingItem.update({
      where: { id: spendingItemId },
      data: { spent: newSpent },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Failed to create entry:", error);
    return NextResponse.json(
      { error: "Failed to create entry" },
      { status: 500 }
    );
  }
}