import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/supabase-server";
import { VALID_CURRENCIES, VALID_DATE_FORMATS, Currency, DateFormat } from "@/lib/constants";

// Default settings for new users
const DEFAULT_SETTINGS = {
  currency: "USD" as Currency,
  dateFormat: "MM/DD/YYYY" as DateFormat,
  darkMode: false,
};

// GET /api/settings — Fetch user settings, create with defaults if none exist
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });

    if (settings) {
      return NextResponse.json(settings);
    }

    const newSettings = await prisma.userSettings.create({
      data: {
        userId: user.id,
        ...DEFAULT_SETTINGS,
      },
    });

    return NextResponse.json(newSettings);
  } catch (error) {
    console.error("[Settings GET] Failed to fetch:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT /api/settings — Update user settings (partial updates supported)
export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currency, dateFormat, darkMode } = body;

    // Reject empty updates
    if (currency === undefined && dateFormat === undefined && darkMode === undefined) {
      return NextResponse.json(
        { error: "At least one field is required to update" },
        { status: 400 }
      );
    }

    // Validate currency
    if (currency !== undefined) {
      if (!VALID_CURRENCIES.includes(currency as Currency)) {
        return NextResponse.json(
          { error: `Invalid currency. Must be one of: ${VALID_CURRENCIES.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Validate date format
    if (dateFormat !== undefined) {
      if (!VALID_DATE_FORMATS.includes(dateFormat as DateFormat)) {
        return NextResponse.json(
          { error: `Invalid date format. Must be one of: ${VALID_DATE_FORMATS.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Validate dark mode
    if (darkMode !== undefined) {
      if (typeof darkMode !== "boolean") {
        return NextResponse.json(
          { error: "darkMode must be a boolean" },
          { status: 400 }
        );
      }
    }

    // Build typed update payload — only include provided fields
    const data: Prisma.UserSettingsUpdateInput = {};
    if (currency !== undefined) data.currency = currency;
    if (dateFormat !== undefined) data.dateFormat = dateFormat;
    if (darkMode !== undefined) data.darkMode = darkMode;

    // Upsert to handle edge case where settings don't exist yet
    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: data,
      create: {
        userId: user.id,
        currency: currency ?? DEFAULT_SETTINGS.currency,
        dateFormat: dateFormat ?? DEFAULT_SETTINGS.dateFormat,
        darkMode: darkMode ?? DEFAULT_SETTINGS.darkMode,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("[Settings PUT] Failed to update:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}