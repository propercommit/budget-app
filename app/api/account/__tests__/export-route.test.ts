import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FAKE_USER } from "../../__tests__/helpers";

const { prismaMock, getAuthenticatedUser, redisMock } = vi.hoisted(() => {
  const model = () => ({
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
  });
  return {
    prismaMock: {
      user: model(),
      category: model(),
      spendingItem: model(),
      spendingEntry: model(),
      incomeSource: model(),
      userSettings: model(),
    },
    getAuthenticatedUser: vi.fn(),
    redisMock: {
      set: vi.fn(),
      ttl: vi.fn(),
      del: vi.fn(),
    },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUser }));
vi.mock("@/lib/redis", () => ({ redis: redisMock }));

import { GET } from "@/app/api/account/export/route";

const COOLDOWN_KEY = `export-cooldown:${FAKE_USER.id}`;

/**
 * The success path holds the response for a deliberate 5s throttle — run GET
 * under fake timers and fast-forward past it. Paths that return before the
 * sleep (401/429/500) schedule no timer and resolve on the same call.
 */
async function runExport(): Promise<Response> {
  const promise = GET();
  await vi.advanceTimersByTimeAsync(5_000);
  return promise;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  getAuthenticatedUser.mockResolvedValue(FAKE_USER);

  // Cooldown free by default; tests override to simulate an active one.
  redisMock.set.mockResolvedValue("OK");
  redisMock.ttl.mockResolvedValue(3600);
  redisMock.del.mockResolvedValue(1);

  // Empty account by default; tests override what they need.
  prismaMock.user.findUnique.mockResolvedValue({
    id: FAKE_USER.id,
    email: FAKE_USER.email,
    name: "Testy",
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
  });
  prismaMock.category.findMany.mockResolvedValue([]);
  prismaMock.spendingItem.findMany.mockResolvedValue([]);
  prismaMock.incomeSource.findMany.mockResolvedValue([]);
  prismaMock.userSettings.findUnique.mockResolvedValue(null);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/account/export", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);

    const res = await runExport();

    expect(res.status).toBe(401);
    expect(redisMock.set).not.toHaveBeenCalled();
    expect(prismaMock.spendingItem.findMany).not.toHaveBeenCalled();
  });

  it("claims the 2-day cooldown atomically before touching the database", async () => {
    await runExport();

    expect(redisMock.set).toHaveBeenCalledWith(COOLDOWN_KEY, expect.any(Number), {
      nx: true,
      ex: 2 * 24 * 60 * 60,
    });

    const setOrder = redisMock.set.mock.invocationCallOrder[0];
    const queryOrder = prismaMock.spendingItem.findMany.mock.invocationCallOrder[0];
    expect(setOrder).toBeLessThan(queryOrder);
  });

  it("429 with retry hint while the cooldown is active, without querying Postgres", async () => {
    redisMock.set.mockResolvedValue(null);
    redisMock.ttl.mockResolvedValue(90_000); // 25h left

    const res = await runExport();

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      error: "You can export your data once every 2 days. Try again in about 25h.",
    });
    expect(prismaMock.spendingItem.findMany).not.toHaveBeenCalled();
    expect(redisMock.del).not.toHaveBeenCalled();
  });

  it("throttles the successful response by 5 seconds", async () => {
    let settled = false;
    const promise = GET().then((res) => {
      settled = true;
      return res;
    });

    await vi.advanceTimersByTimeAsync(4_999);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const res = await promise;
    expect(res.status).toBe(200);
  });

  it("responds as a CSV attachment", async () => {
    const res = await runExport();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toMatch(
      /^attachment; filename="budget-export-\d{4}-\d{2}-\d{2}\.csv"$/
    );
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("scopes every query to the authenticated user", async () => {
    await runExport();

    expect(prismaMock.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: FAKE_USER.id } })
    );
    expect(prismaMock.spendingItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: FAKE_USER.id } })
    );
    expect(prismaMock.incomeSource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: FAKE_USER.id } })
    );
    expect(prismaMock.userSettings.findUnique).toHaveBeenCalledWith({
      where: { userId: FAKE_USER.id },
    });
  });

  it("exports all sections with account, category, spending, income, and settings data", async () => {
    prismaMock.category.findMany.mockResolvedValue([
      {
        id: "cat-1",
        label: "Food, drinks & fun",
        icon: "pizza",
        color: "#34C759",
        createdAt: new Date("2026-02-01T00:00:00Z"),
        updatedAt: new Date("2026-02-01T00:00:00Z"),
        userId: FAKE_USER.id,
      },
    ]);
    prismaMock.spendingItem.findMany.mockResolvedValue([
      {
        id: "item-1",
        name: "Groceries",
        icon: "cart",
        budgeted: 50000,
        spent: 99999, // stale on purpose — export must recompute from entries
        month: "2026-06",
        startDate: new Date("2026-06-01T00:00:00Z"),
        endDate: null,
        note: null,
        userId: FAKE_USER.id,
        categoryId: "cat-1",
        category: { label: "Food, drinks & fun" },
        spendingEntries: [
          {
            id: "e1",
            name: "Migros",
            amount: 1029,
            direction: "debit",
            receiptUrl: "data:image/jpeg;base64,xxx",
            link: null,
            date: new Date("2026-06-03T12:00:00Z"),
            spendingItemId: "item-1",
          },
          {
            id: "e2",
            name: "Refund",
            amount: 500,
            direction: "credit",
            receiptUrl: null,
            link: "https://example.com/order",
            date: new Date("2026-06-04T12:00:00Z"),
            spendingItemId: "item-1",
          },
        ],
      },
    ]);
    prismaMock.incomeSource.findMany.mockResolvedValue([
      {
        id: "inc-1",
        name: "Salary",
        amount: 550000,
        icon: "banknote",
        type: "active",
        startDate: new Date("2026-06-01T00:00:00Z"),
        endDate: null,
        note: null,
        month: "2026-06",
        createdAt: new Date("2026-06-01T00:00:00Z"),
        updatedAt: new Date("2026-06-01T00:00:00Z"),
        userId: FAKE_USER.id,
      },
    ]);
    prismaMock.userSettings.findUnique.mockResolvedValue({
      id: "set-1",
      userId: FAKE_USER.id,
      currency: "CHF",
      dateFormat: "DD/MM/YYYY",
      darkMode: true,
      createdAt: new Date("2026-01-15T10:00:00Z"),
      updatedAt: new Date("2026-01-15T10:00:00Z"),
    });

    const res = await runExport();
    const csv = await res.text();
    const lines = csv.split("\r\n");

    // Account section carries the user row.
    expect(lines).toContain("Account");
    expect(lines).toContain("test@example.com,Testy,2026-01-15");

    // Category label with a comma is quoted.
    expect(lines).toContain('"Food, drinks & fun",pizza,#34C759,2026-02-01');

    // Spent is the signed entry sum (1029 - 500 = 529 cents), not the stale stored 99999.
    expect(lines).toContain(
      '2026-06,Groceries,"Food, drinks & fun",cart,500.00,5.29,2026-06-01,,'
    );
    expect(csv).not.toContain("999.99");

    // Entries: receipt presence flag instead of the base64 payload.
    expect(lines).toContain("2026-06,Groceries,Migros,10.29,debit,2026-06-03,,yes");
    expect(lines).toContain(
      "2026-06,Groceries,Refund,5.00,credit,2026-06-04,https://example.com/order,no"
    );
    expect(csv).not.toContain("base64");

    // Income and settings rows.
    expect(lines).toContain("2026-06,Salary,active,5500.00,banknote,2026-06-01,,");
    expect(lines).toContain("CHF,DD/MM/YYYY,true");
  });

  it("falls back to the JWT identity and default settings when no rows exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await runExport();
    const lines = (await res.text()).split("\r\n");

    expect(lines).toContain("test@example.com,,");
    expect(lines).toContain("USD,MM/DD/YYYY,false");
  });

  it("returns 500 and releases the cooldown when a query throws", async () => {
    prismaMock.spendingItem.findMany.mockRejectedValue(new Error("db down"));

    const res = await runExport();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to export data" });
    expect(redisMock.del).toHaveBeenCalledWith(COOLDOWN_KEY);
  });
});
