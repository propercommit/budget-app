import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { prisma } from "@/lib/prisma"

// Create a Supabase admin client for user deletion
// This requires the service role key (not the anon key)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
)

export async function DELETE(request: NextRequest) {
    try {
        // Get user ID from the request header (set by middleware)
        const userId = request.headers.get("x-user-id")

        if (!userId || userId === "temp-user") {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        // Delete all user data from the database in the correct order
        // (respecting foreign key constraints)

        // 1. Delete all spending entries (child of spending items)
        await prisma.spendingEntry.deleteMany({
            where: {
                spendingItem: {
                    userId: userId,
                },
            },
        })

        // 2. Delete all spending items
        await prisma.spendingItem.deleteMany({
            where: { userId: userId },
        })

        // 3. Delete all categories
        await prisma.category.deleteMany({
            where: { userId: userId },
        })

        // 4. Delete all monthly income records
        await prisma.monthlyIncome.deleteMany({
            where: { userId: userId },
        })

        // 5. Delete the user record
        await prisma.user.delete({
            where: { id: userId },
        })

        // 6. Delete the user from Supabase Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (authError) {
            console.error("Failed to delete user from Supabase Auth:", authError)
            // Continue anyway - the database data is already deleted
            // The auth record will be orphaned but the user can't log in
            // since their data is gone
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to delete account:", error)
        return NextResponse.json(
            { error: "Failed to delete account" },
            { status: 500 }
        )
    }
}