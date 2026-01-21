import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/categories - Fetch all categories for a user
export async function GET(request: NextRequest) {
  try {
    // For now, we'll use a hardcoded userId (we'll add auth later)
    const userId = request.headers.get("x-user-id") || "temp-user";

    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create a new category
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "temp-user";
    const body = await request.json();
    const { label, icon, color } = body;

    // Validate required fields
    if (!label || !icon || !color) {
      return NextResponse.json(
        { error: "Missing required fields: label, icon, color" },
        { status: 400 }
      );
    }

    // Ensure user exists (create if not)
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: `${userId}@temp.com` },
    });

    // Create the category
    const category = await prisma.category.create({
      data: {
        label,
        icon,
        color,
        userId,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Failed to create category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}