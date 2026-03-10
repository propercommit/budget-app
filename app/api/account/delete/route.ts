import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}

export async function DELETE() {
    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const userId = user.id;

        await prisma.spendingEntry.deleteMany({
            where: { spendingItem: { userId } },
        });

        await prisma.spendingItem.deleteMany({
            where: { userId },
        });

        await prisma.category.deleteMany({
            where: { userId },
        });

        await prisma.incomeSource.deleteMany({
            where: { userId },
        });

        await prisma.user.delete({
            where: { id: userId },
        });

        const supabaseAdmin = getSupabaseAdmin();
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authError) {
            console.error("Failed to delete user from Supabase Auth:", authError);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete account:", error);
        return NextResponse.json(
            { error: "Failed to delete account" },
            { status: 500 }
        );
    }
}