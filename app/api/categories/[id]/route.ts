import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/supabase-server";

// Constants
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const MAX_LABEL_LENGTH = 30;

// PUT /api/categories/[id] - Update a category
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
        const { label, icon, color } = body;

        // Validate at least one field is being updated
        if (!label && !icon && !color) {
            return NextResponse.json(
                { error: "At least one field (label, icon, or color) is required" },
                { status: 400 }
            );
        }

        // Validate label if provided
        if (label !== undefined) {
            if (typeof label !== "string" || label.trim() === "") {
                return NextResponse.json(
                    { error: "Label must be a non-empty string" },
                    { status: 400 }
                );
            }
            if (label.trim().length > MAX_LABEL_LENGTH) {
                return NextResponse.json(
                    { error: `Label must be ${MAX_LABEL_LENGTH} characters or less` },
                    { status: 400 }
                );
            }
        }

        // Validate icon if provided
        if (icon !== undefined && (typeof icon !== "string" || icon === "")) {
            return NextResponse.json(
                { error: "Icon must be a non-empty string" },
                { status: 400 }
            );
        }

        // Validate color format if provided
        if (color !== undefined) {
            if (typeof color !== "string" || !HEX_COLOR_REGEX.test(color)) {
                return NextResponse.json(
                    { error: "Color must be a valid hex color (e.g., #FF5733)" },
                    { status: 400 }
                );
            }
        }

        // Check if category exists and belongs to user
        const existing = await prisma.category.findFirst({
            where: { id, userId: user.id },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Category not found" },
                { status: 404 }
            );
        }

        // Build update data object
        const updateData: { label?: string; icon?: string; color?: string } = {};
        if (label) updateData.label = label.trim();
        if (icon) updateData.icon = icon;
        if (color) updateData.color = color;

        // Update the category
        const category = await prisma.category.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(category);
    } catch (error) {
        console.error("[Categories PUT] Failed to update:", error);
        return NextResponse.json(
            { error: "Failed to update category" },
            { status: 500 }
        );
    }
}

// DELETE /api/categories/[id] - Delete a category
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

        // Validate id format (basic check)
        if (!id || typeof id !== "string") {
            return NextResponse.json(
                { error: "Invalid category ID" },
                { status: 400 }
            );
        }

        // Check if category exists and belongs to user
        const existing = await prisma.category.findFirst({
            where: { id, userId: user.id },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Category not found" },
                { status: 404 }
            );
        }

        // Delete the category (spending items will cascade delete)
        await prisma.category.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Categories DELETE] Failed to delete:", error);
        return NextResponse.json(
            { error: "Failed to delete category" },
            { status: 500 }
        );
    }
}