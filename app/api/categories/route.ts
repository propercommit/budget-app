import { NextResponse } from "next/server";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { ensureUser } from "@/lib/user";

// Constants (kept in sync with PUT /api/categories/[id])
const MAX_LABEL_LENGTH = 30;

// GET /api/categories - Fetch all categories for the authenticated user
export async function GET() {
    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" }, 
                { status: 401 }
            );
        }

        const categories = await prisma.category.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "asc" },
        });

        return NextResponse.json(categories);
    } catch (error) {
        console.error("[Categories GET] Failed to fetch:", error);
        return NextResponse.json(
            { error: "Failed to fetch categories" },
            { status: 500 }
        );
    }
}

// POST /api/categories - Create a new category
export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" }, 
                { status: 401 }
            );
        }

        const body = await request.json();
        const { label, icon, color } = body;

        // Validate required fields
        if (!label || typeof label !== "string" || label.trim() === "") {
            return NextResponse.json(
                { error: "Label is required" },
                { status: 400 }
            );
        }

        if (label.trim().length > MAX_LABEL_LENGTH) {
            return NextResponse.json(
                { error: `Label must be ${MAX_LABEL_LENGTH} characters or less` },
                { status: 400 }
            );
        }

        if (!icon || typeof icon !== "string") {
            return NextResponse.json(
                { error: "Icon is required" },
                { status: 400 }
            );
        }

        if (!color || typeof color !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
            return NextResponse.json(
                { error: "Valid hex color is required (e.g., #FF5733)" },
                { status: 400 }
            );
        }

        await ensureUser(user);

        // Create the category
        const category = await prisma.category.create({
            data: {
                label: label.trim(),
                icon,
                color,
                userId: user.id,
            },
        });

        return NextResponse.json(category, { status: 201 });
    } catch (error) {
        // Duplicate (userId, label) violates @@unique — surface a friendly 409
        // instead of a generic 500 so the client can show "already exists".
        if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json(
                { error: "A category with this name already exists" },
                { status: 409 }
            );
        }

        console.error("[Categories POST] Failed to create:", error);
        return NextResponse.json(
            { error: "Failed to create category" },
            { status: 500 }
        );
    }
}