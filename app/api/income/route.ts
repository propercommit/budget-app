import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/income?month=2025-01 - Fetch income for a month
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "temp-user";
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (month) {
      // Get income for a specific month
      const income = await prisma.monthlyIncome.findUnique({
        where: {
          userId_month: { userId, month },
        },
      });

      return NextResponse.json(income || { active: 0, passive: 0, month });
    } else {
      // Get all income records for the user
      const incomes = await prisma.monthlyIncome.findMany({
        where: { userId },
        orderBy: { month: "asc" },
      });

      return NextResponse.json(incomes);
    }
  } catch (error) {
    console.error("Failed to fetch income:", error);
    return NextResponse.json(
      { error: "Failed to fetch income" },
      { status: 500 }
    );
  }
}

// POST /api/income - Create or update income for a month
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "temp-user";
    const body = await request.json();
    const { month, active, passive } = body;

    // Validate required fields
    if (!month) {
      return NextResponse.json(
        { error: "Missing required field: month" },
        { status: 400 }
      );
    }

    // Ensure user exists
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: `${userId}@temp.com` },
    });

    // Create or update income (upsert)
    const income = await prisma.monthlyIncome.upsert({
      where: {
        userId_month: { userId, month },
      },
      update: {
        ...(active !== undefined && { active }),
        ...(passive !== undefined && { passive }),
      },
      create: {
        month,
        active: active || 0,
        passive: passive || 0,
        userId,
      },
    });

    return NextResponse.json(income);
  } catch (error) {
    console.error("Failed to save income:", error);
    return NextResponse.json(
      { error: "Failed to save income" },
      { status: 500 }
    );
  }
}