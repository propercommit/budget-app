import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { delay } from "@/lib/retry";
import { sumEntries } from "@/lib/spending/math";
import { centsToDecimalString } from "@/lib/money";
import { buildCsv, type CsvSection } from "@/lib/csv";
import { DEFAULT_USER_SETTINGS } from "@/lib/constants";

// One export per user per 2 days. The cooldown is claimed atomically (SET NX)
// BEFORE any database work, so hammering the endpoint costs one Redis call per
// request, not five Postgres queries.
const EXPORT_COOLDOWN_SECONDS = 2 * 24 * 60 * 60;
const EXPORT_COOLDOWN_PREFIX = "export-cooldown:";

// Deliberate throttle on the SUCCESS path only: the export is a bulk read, so
// its response is slowed to keep it unattractive as a load vector. Rejected
// (401/429) requests return immediately — delaying those would hold server
// functions open longer and make resource exhaustion easier, not harder.
const EXPORT_DELAY_MS = 5_000;

/** `YYYY-MM-DD` for a stored date, empty cell for a nullable one that's unset. */
function isoDate(date: Date | null): string {

    if (date === null) return "";

    return date.toISOString().slice(0, 10);
}

// GET /api/account/export - Download all of the user's data as one CSV file
export async function GET() {

    // Set once the cooldown is claimed, so a failed export can release it —
    // a 500 must not lock the user out of their data for 2 days.
    let claimedCooldownKey: string | null = null;

    try {
        const user = await getAuthenticatedUser();

        if (user === null) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const userId = user.id;
        const cooldownKey = `${EXPORT_COOLDOWN_PREFIX}${userId}`;

        // SET NX claims the cooldown atomically — a burst of parallel requests
        // yields exactly one export; the rest see null and are rejected here,
        // before any Postgres query runs.
        const claimed = await redis.set(cooldownKey, Date.now(), {
            nx: true,
            ex: EXPORT_COOLDOWN_SECONDS,
        });

        if (claimed === null) {
            const secondsLeft = await redis.ttl(cooldownKey);
            const hoursLeft = Math.max(1, Math.ceil(secondsLeft / 3600));

            return NextResponse.json(
                { error: `You can export your data once every 2 days. Try again in about ${hoursLeft}h.` },
                { status: 429 }
            );
        }

        claimedCooldownKey = cooldownKey;

        const [account, categories, spendingItems, incomeSources, settings] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId } }),
            prisma.category.findMany({
                where: { userId },
                orderBy: { label: "asc" },
            }),
            prisma.spendingItem.findMany({
                where: { series: { userId } },
                include: {
                    spendingEntries: { orderBy: { date: "asc" } },
                    series: { select: { name: true, icon: true, recurring: true, category: { select: { label: true } } } },
                },
                orderBy: [{ month: "asc" }, { series: { name: "asc" } }],
            }),
            prisma.incomeSource.findMany({
                where: { userId },
                orderBy: [{ month: "asc" }, { name: "asc" }],
            }),
            prisma.userSettings.findUnique({ where: { userId } }),
        ]);

        const sections: CsvSection[] = [
            {
                title: "Account",
                header: ["Email", "Name", "Member Since"],
                // The User row is lazily created on first category write, so a
                // brand-new account may not have one yet — fall back to the JWT.
                rows: [
                    account !== null
                        ? [account.email, account.name, isoDate(account.createdAt)]
                        : [user.email, null, null],
                ],
            },
            {
                title: "Categories",
                header: ["Label", "Icon", "Color", "Created"],
                rows: categories.map((category) => [
                    category.label,
                    category.icon,
                    category.color,
                    isoDate(category.createdAt),
                ]),
            },
            {
                title: "Spending Items",
                header: ["Month", "Name", "Category", "Icon", "Recurring", "Budgeted", "Spent", "Note"],
                // Name/category/icon/recurring live on the BudgetSeries; each
                // row is that series' incarnation in one month. `spent` is
                // recomputed as the signed sum of entries — the stored column
                // is denormalized and never trusted on read.
                rows: spendingItems.map((item) => [
                    item.month,
                    item.series.name,
                    item.series.category.label,
                    item.series.icon,
                    item.series.recurring,
                    centsToDecimalString(item.budgeted),
                    centsToDecimalString(sumEntries(item.spendingEntries)),
                    item.note,
                ]),
            },
            {
                title: "Spending Entries",
                header: ["Month", "Spending Item", "Name", "Amount", "Direction", "Date", "Link", "Has Receipt"],
                // Receipts are inlined base64 images — far too large for a CSV
                // cell, so only their presence is exported.
                rows: spendingItems.flatMap((item) =>
                    item.spendingEntries.map((entry) => [
                        item.month,
                        item.series.name,
                        entry.name,
                        centsToDecimalString(entry.amount),
                        entry.direction,
                        isoDate(entry.date),
                        entry.link,
                        entry.receiptUrl !== null && entry.receiptUrl !== "" ? "yes" : "no",
                    ])
                ),
            },
            {
                title: "Income Sources",
                header: ["Month", "Name", "Type", "Amount", "Icon", "Start Date", "End Date", "Note"],
                rows: incomeSources.map((income) => [
                    income.month,
                    income.name,
                    income.type,
                    centsToDecimalString(income.amount),
                    income.icon,
                    isoDate(income.startDate),
                    isoDate(income.endDate),
                    income.note,
                ]),
            },
            {
                title: "Settings",
                header: ["Currency", "Date Format", "Dark Mode"],
                rows: [
                    settings !== null
                        ? [settings.currency, settings.dateFormat, settings.darkMode]
                        : [DEFAULT_USER_SETTINGS.currency, DEFAULT_USER_SETTINGS.dateFormat, DEFAULT_USER_SETTINGS.darkMode],
                ],
            },
        ];

        const csv = buildCsv(sections);
        const filename = `budget-export-${isoDate(new Date())}.csv`;

        await delay(EXPORT_DELAY_MS);

        return new NextResponse(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("[Account Export GET] Failed to export:", error);

        // Best-effort release: the user got no data, so don't burn their
        // 2-day window. If this del also fails, the cooldown just stands.
        if (claimedCooldownKey !== null) await redis.del(claimedCooldownKey).catch(() => undefined);

        return NextResponse.json(
            { error: "Failed to export data" },
            { status: 500 }
        );
    }
}
