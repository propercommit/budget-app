import { describe, it, expect, beforeEach, vi } from "vitest";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import {
  FAKE_USER,
  jsonRequest,
  getRequest,
  readJson,
} from "../../__tests__/helpers";

const { prismaMock, getAuthenticatedUser } = vi.hoisted(() => {
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
      category: model(),
      spendingItem: model(),
      budgetSeries: model(),
      $transaction: vi.fn(),
    },
    getAuthenticatedUser: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUser }));

import { GET, POST } from "@/app/api/spending/route";

const FAKE_CATEGORY = { id: "cat-1", label: "Housing", icon: "home", color: "#007AFF" };

const FAKE_SERIES = {
  id: "ser-1",
  name: "Rent",
  icon: "home",
  recurring: true,
  userId: FAKE_USER.id,
  categoryId: FAKE_CATEGORY.id,
};

/** A Prisma-shaped incarnation as loaded with the series include. */
const dbItem = (over: Record<string, unknown> = {}) => ({
  id: "s1",
  seriesId: FAKE_SERIES.id,
  month: "2026-06",
  budgeted: 0,
  spent: 0,
  note: null,
  series: { ...FAKE_SERIES, category: FAKE_CATEGORY },
  spendingEntries: [],
  ...over,
});

// New-series create shape (resume/attach uses `seriesId` instead of name/icon/categoryId).
const validBody = {
  name: "Rent",
  icon: "home",
  categoryId: "cat-1",
  month: "2026-06",
};

beforeEach(() => {
  vi.clearAllMocks();
  getAuthenticatedUser.mockResolvedValue(FAKE_USER);
  // Callback transactions run against the same mock client.
  prismaMock.$transaction.mockImplementation(
    async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock)
  );
});

describe("GET /api/spending", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const { status } = await readJson(
      await GET(getRequest("http://localhost/api/spending"))
    );
    expect(status).toBe(401);
  });

  it("400 when month query is malformed", async () => {
    const { status, body } = await readJson(
      await GET(getRequest("http://localhost/api/spending?month=2026-13"))
    );
    expect(status).toBe(400);
    expect(body).toEqual({
      error: "Invalid month format. Use YYYY-MM (e.g., 2025-01)",
    });
    expect(prismaMock.spendingItem.findMany).not.toHaveBeenCalled();
  });

  it("groups items by month and maps spendingEntries → entries", async () => {
    prismaMock.spendingItem.findMany.mockResolvedValue([
      dbItem({ id: "s1", month: "2026-02", spendingEntries: [{ id: "e1" }] }),
      dbItem({ id: "s2", month: "2026-10" }),
      dbItem({ id: "s3", month: "2026-02" }),
    ]);

    const { status, body } = await readJson(
      await GET(getRequest("http://localhost/api/spending"))
    );

    expect(status).toBe(200);
    const grouped = body as Record<string, Array<{ id: string; entries: unknown[] }>>;
    expect(Object.keys(grouped)).toEqual(["2026-02", "2026-10"]);
    expect(grouped["2026-02"].map((i) => i.id)).toEqual(["s1", "s3"]);
    // entries is aliased from spendingEntries
    expect(grouped["2026-02"][0].entries).toEqual([{ id: "e1" }]);
  });

  it("flattens series identity fields into each item", async () => {
    prismaMock.spendingItem.findMany.mockResolvedValue([dbItem()]);

    const { body } = await readJson(
      await GET(getRequest("http://localhost/api/spending"))
    );

    const item = (body as Record<string, Array<Record<string, unknown>>>)["2026-06"][0];
    expect(item.name).toBe("Rent");
    expect(item.icon).toBe("home");
    expect(item.seriesId).toBe("ser-1");
    expect(item.recurring).toBe(true);
    expect(item.categoryId).toBe("cat-1");
    expect(item.category).toEqual(FAKE_CATEGORY);
    // The raw series object is not leaked alongside the flattened fields.
    expect(item.series).toBeUndefined();
  });

  it("scopes by series ownership and passes the month filter through", async () => {
    prismaMock.spendingItem.findMany.mockResolvedValue([]);
    await GET(getRequest("http://localhost/api/spending?month=2026-06"));
    expect(prismaMock.spendingItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { series: { userId: FAKE_USER.id }, month: "2026-06" },
      })
    );
  });
});

describe("POST /api/spending — new series", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const { status } = await readJson(await POST(jsonRequest(validBody)));
    expect(status).toBe(401);
  });

  it("400 when name missing", async () => {
    const { status, body } = await readJson(
      await POST(jsonRequest({ ...validBody, name: "" }))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "Name is required" });
  });

  it("400 when categoryId missing", async () => {
    const { status, body } = await readJson(
      await POST(jsonRequest({ ...validBody, categoryId: undefined }))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "Category ID is required" });
  });

  it("400 when month is missing", async () => {
    const { status, body } = await readJson(
      await POST(jsonRequest({ ...validBody, month: undefined }))
    );
    expect(status).toBe(400);
    expect(body).toEqual({
      error: "Month is required in YYYY-MM format (e.g., 2025-01)",
    });
  });

  it("400 when month is not zero-padded YYYY-MM", async () => {
    const { status } = await readJson(
      await POST(jsonRequest({ ...validBody, month: "2026-6" }))
    );
    expect(status).toBe(400);
  });

  it("400 when budgeted is out of range", async () => {
    const { status, body } = await readJson(
      await POST(jsonRequest({ ...validBody, budgeted: 10_000_000_001 }))
    );
    expect(status).toBe(400);
    expect(body).toEqual({
      error: "Budgeted must be between 0 and 100,000,000",
    });
  });

  it("400 when recurring is not a boolean", async () => {
    const { status, body } = await readJson(
      await POST(jsonRequest({ ...validBody, recurring: "yes" }))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "Recurring must be a boolean" });
  });

  it("404 when category does not belong to user", async () => {
    prismaMock.category.findFirst.mockResolvedValue(null);
    const { status, body } = await readJson(await POST(jsonRequest(validBody)));
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Category not found" });
    expect(prismaMock.spendingItem.create).not.toHaveBeenCalled();
  });

  it("409 series_active_this_month when the name's series already has this month's incarnation", async () => {
    prismaMock.category.findFirst.mockResolvedValue(FAKE_CATEGORY);
    prismaMock.budgetSeries.findUnique.mockResolvedValue(FAKE_SERIES);
    prismaMock.spendingItem.findUnique.mockResolvedValue({ id: "existing" });

    const { status, body } = await readJson(await POST(jsonRequest(validBody)));

    expect(status).toBe(409);
    expect(body).toEqual({ error: "series_active_this_month" });
    expect(prismaMock.spendingItem.create).not.toHaveBeenCalled();
  });

  it("409 series_dormant with resume data when the name's series has no incarnation this month", async () => {
    prismaMock.category.findFirst.mockResolvedValue(FAKE_CATEGORY);
    prismaMock.budgetSeries.findUnique.mockResolvedValue(FAKE_SERIES);
    prismaMock.spendingItem.findUnique.mockResolvedValue(null);
    prismaMock.spendingItem.findFirst.mockResolvedValue({ id: "old", month: "2026-03", budgeted: 189_000 });

    const { status, body } = await readJson(await POST(jsonRequest(validBody)));

    expect(status).toBe(409);
    expect(body).toEqual({
      error: "series_dormant",
      series: {
        id: "ser-1",
        name: "Rent",
        icon: "home",
        categoryId: "cat-1",
        lastActiveMonth: "2026-03",
        lastBudgeted: 189_000,
        recurring: true,
      },
    });
  });

  it("409 series_dormant with null history for a series with no incarnations left", async () => {
    prismaMock.category.findFirst.mockResolvedValue(FAKE_CATEGORY);
    prismaMock.budgetSeries.findUnique.mockResolvedValue(FAKE_SERIES);
    prismaMock.spendingItem.findUnique.mockResolvedValue(null);
    prismaMock.spendingItem.findFirst.mockResolvedValue(null);

    const { body } = await readJson(await POST(jsonRequest(validBody)));

    const conflict = body as { series: { lastActiveMonth: string | null; lastBudgeted: number | null } };
    expect(conflict.series.lastActiveMonth).toBeNull();
    expect(conflict.series.lastBudgeted).toBeNull();
  });

  it("creates the series and its first incarnation in one transaction", async () => {
    prismaMock.category.findFirst.mockResolvedValue(FAKE_CATEGORY);
    prismaMock.budgetSeries.findUnique.mockResolvedValue(null);
    prismaMock.budgetSeries.create.mockResolvedValue(FAKE_SERIES);
    prismaMock.spendingItem.create.mockResolvedValue(dbItem());

    const { status, body } = await readJson(
      await POST(jsonRequest({ ...validBody, name: "  Rent  " }))
    );

    expect(status).toBe(201);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);

    const seriesArg = prismaMock.budgetSeries.create.mock.calls[0][0];
    expect(seriesArg.data).toEqual({
      name: "Rent", // trimmed
      icon: "home",
      categoryId: "cat-1",
      userId: FAKE_USER.id,
      recurring: true, // defaults ON
    });

    const itemArg = prismaMock.spendingItem.create.mock.calls[0][0];
    expect(itemArg.data).toEqual({
      seriesId: "ser-1",
      month: "2026-06",
      budgeted: 0,
      note: null,
    });

    expect((body as { name: string }).name).toBe("Rent");
    expect((body as { entries: unknown[] }).entries).toEqual([]);
  });

  it("passes recurring: false through to the new series", async () => {
    prismaMock.category.findFirst.mockResolvedValue(FAKE_CATEGORY);
    prismaMock.budgetSeries.findUnique.mockResolvedValue(null);
    prismaMock.budgetSeries.create.mockResolvedValue({ ...FAKE_SERIES, recurring: false });
    prismaMock.spendingItem.create.mockResolvedValue(dbItem());

    await POST(jsonRequest({ ...validBody, recurring: false }));

    const seriesArg = prismaMock.budgetSeries.create.mock.calls[0][0];
    expect(seriesArg.data.recurring).toBe(false);
  });

  it("answers a lost create race (P2002) with the structured series conflict", async () => {
    prismaMock.category.findFirst.mockResolvedValue(FAKE_CATEGORY);
    // Pre-check sees no series; the transaction then loses the race.
    prismaMock.budgetSeries.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(FAKE_SERIES);
    const p2002 = new PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "6",
    });
    prismaMock.budgetSeries.create.mockRejectedValue(p2002);
    prismaMock.spendingItem.findUnique.mockResolvedValue({ id: "existing" });

    const { status, body } = await readJson(await POST(jsonRequest(validBody)));

    expect(status).toBe(409);
    expect(body).toEqual({ error: "series_active_this_month" });
  });
});

describe("POST /api/spending — resume/attach by seriesId", () => {
  const attachBody = { seriesId: "ser-1", month: "2026-06" };

  it("400 when seriesId is empty", async () => {
    const { status, body } = await readJson(
      await POST(jsonRequest({ ...attachBody, seriesId: "" }))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "Series ID must be a non-empty string" });
  });

  it("404 when the series does not belong to the user", async () => {
    prismaMock.budgetSeries.findFirst.mockResolvedValue(null);
    const { status, body } = await readJson(await POST(jsonRequest(attachBody)));
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Series not found" });
    expect(prismaMock.spendingItem.create).not.toHaveBeenCalled();
  });

  it("creates the incarnation for the month and returns it flattened", async () => {
    prismaMock.budgetSeries.findFirst.mockResolvedValue(FAKE_SERIES);
    prismaMock.spendingItem.create.mockResolvedValue(dbItem({ budgeted: 5000 }));

    const { status, body } = await readJson(
      await POST(jsonRequest({ ...attachBody, budgeted: 5000 }))
    );

    expect(status).toBe(201);
    const itemArg = prismaMock.spendingItem.create.mock.calls[0][0];
    expect(itemArg.data).toEqual({
      seriesId: "ser-1",
      month: "2026-06",
      budgeted: 5000,
      note: null,
    });
    expect((body as { name: string }).name).toBe("Rent");
    // recurring untouched when not sent
    expect(prismaMock.budgetSeries.update).not.toHaveBeenCalled();
  });

  it("updates the series' recurring toggle when the resume changes it", async () => {
    prismaMock.budgetSeries.findFirst.mockResolvedValue(FAKE_SERIES);
    prismaMock.spendingItem.create.mockResolvedValue(dbItem());

    await POST(jsonRequest({ ...attachBody, recurring: false }));

    expect(prismaMock.budgetSeries.update).toHaveBeenCalledWith({
      where: { id: "ser-1" },
      data: { recurring: false },
    });
  });

  it("skips the recurring update when the value is unchanged", async () => {
    prismaMock.budgetSeries.findFirst.mockResolvedValue(FAKE_SERIES);
    prismaMock.spendingItem.create.mockResolvedValue(dbItem());

    await POST(jsonRequest({ ...attachBody, recurring: true }));

    expect(prismaMock.budgetSeries.update).not.toHaveBeenCalled();
  });

  // (seriesId, month) is unique — attaching to an already-active month conflicts.
  it("409 series_active_this_month on a duplicate (seriesId, month)", async () => {
    prismaMock.budgetSeries.findFirst.mockResolvedValue(FAKE_SERIES);
    const p2002 = new PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "6",
    });
    prismaMock.spendingItem.create.mockRejectedValue(p2002);

    const { status, body } = await readJson(await POST(jsonRequest(attachBody)));

    expect(status).toBe(409);
    expect(body).toEqual({ error: "series_active_this_month" });
  });
});
