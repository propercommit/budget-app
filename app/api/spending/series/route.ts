import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

/**
 * The user's full series list, powering the create popin's client-side
 * typeahead (one fetch per popin open — never per keystroke). Dormant series
 * may predate the dashboard's 12-month data window, so this cannot be derived
 * from loaded spending data.
 *
 * Each series carries its activity summary: first/last incarnated month and
 * the latest incarnation's budget (what a Resume prefills, D23/D24).
 */
export async function GET() {
    try {
        const user = await getAuthenticatedUser();

        if (user === null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const series = await prisma.budgetSeries.findMany({
            where: { userId: user.id },
            include: {
                category: { select: { label: true, color: true } },
                // Months are zero-padded YYYY-MM, so lexicographic order is
                // chronological: first row = latest incarnation.
                items: { select: { month: true, budgeted: true }, orderBy: { month: "desc" } },
            },
            orderBy: { name: "asc" },
        });

        const summaries = series.map((s) => ({
            id: s.id,
            name: s.name,
            icon: s.icon,
            categoryId: s.categoryId,
            categoryLabel: s.category.label,
            categoryColor: s.category.color,
            recurring: s.recurring,
            firstActiveMonth: s.items.length > 0 ? s.items[s.items.length - 1].month : null,
            lastActiveMonth: s.items.length > 0 ? s.items[0].month : null,
            lastBudgeted: s.items.length > 0 ? s.items[0].budgeted : null,
        }));

        return NextResponse.json(summaries);
    } catch (error) {
        console.error("[Series GET] Failed to fetch:", error);
        return NextResponse.json({ error: "Failed to fetch series" }, { status: 500 });
    }
}
