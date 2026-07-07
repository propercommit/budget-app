import { describe, it, expect, beforeEach, vi } from "vitest";
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
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
  });
  return {
    prismaMock: {
      spendingItem: model(),
      spendingEntry: model(),
      $transaction: vi.fn(),
    },
    getAuthenticatedUser: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUser }));

import { GET, POST } from "@/app/api/entries/route";

const validBody = { spendingItemId: "s1", name: "Coffee", amount: 450 };

// validBody has no date, so the route defaults to "now" — the addressed item
// must live in the current (UTC) month for the direct-attach path to apply.
const CURRENT_MONTH = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`;

const FAKE_ITEM = { id: "s1", seriesId: "ser-1", month: CURRENT_MONTH };

beforeEach(() => {
  vi.clearAllMocks();
  getAuthenticatedUser.mockResolvedValue(FAKE_USER);
  prismaMock.$transaction.mockImplementation(
    async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock)
  );
});

describe("GET /api/entries", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const { status } = await readJson(
      await GET(getRequest("http://localhost/api/entries?spendingItemId=s1"))
    );
    expect(status).toBe(401);
  });

  it("400 when spendingItemId query is missing", async () => {
    const { status, body } = await readJson(
      await GET(getRequest("http://localhost/api/entries"))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "spendingItemId is required" });
  });

  it("404 when the spending item is not owned by the user", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue(null);
    const { status, body } = await readJson(
      await GET(getRequest("http://localhost/api/entries?spendingItemId=s1"))
    );
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Spending item not found" });
  });

  it("returns entries ordered by date desc", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue(FAKE_ITEM);
    prismaMock.spendingEntry.findMany.mockResolvedValue([{ id: "e1" }]);
    const { status, body } = await readJson(
      await GET(getRequest("http://localhost/api/entries?spendingItemId=s1"))
    );
    expect(status).toBe(200);
    expect(body).toEqual([{ id: "e1" }]);
    expect(prismaMock.spendingEntry.findMany).toHaveBeenCalledWith({
      where: { spendingItemId: "s1" },
      orderBy: { date: "desc" },
    });
  });
});

describe("POST /api/entries", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const { status } = await readJson(await POST(jsonRequest(validBody)));
    expect(status).toBe(401);
  });

  it("400 when amount is missing", async () => {
    const { status, body } = await readJson(
      await POST(jsonRequest({ spendingItemId: "s1", name: "X" }))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "Amount is required" });
  });

  it("400 when amount is not finite", async () => {
    const { status, body } = await readJson(
      await POST(jsonRequest({ ...validBody, amount: "5" }))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "Amount must be a valid number" });
  });

  it("400 when link is not a valid http(s) URL", async () => {
    const { status, body } = await readJson(
      await POST(jsonRequest({ ...validBody, link: "ftp://example.com" }))
    );
    expect(status).toBe(400);
    expect(body).toEqual({
      error: "Link must be a valid URL starting with http:// or https://",
    });
  });

  it("accepts a valid https link", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue(FAKE_ITEM);
    prismaMock.spendingEntry.create.mockResolvedValue({ id: "e1" });
    prismaMock.spendingEntry.findMany.mockResolvedValue([{ amount: 450, direction: "debit" }]);
    prismaMock.spendingItem.update.mockResolvedValue({});
    const { status } = await readJson(
      await POST(jsonRequest({ ...validBody, link: "https://shop.example.com/x" }))
    );
    expect(status).toBe(201);
  });

  it("400 when date string is unparseable", async () => {
    const { status, body } = await readJson(
      await POST(jsonRequest({ ...validBody, date: "not-a-date" }))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "Date must be a valid date string" });
  });

  it("404 when the spending item is not owned by the user", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue(null);
    const { status, body } = await readJson(await POST(jsonRequest(validBody)));
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Spending item not found" });
    expect(prismaMock.spendingEntry.create).not.toHaveBeenCalled();
  });

  it("creates the entry and recomputes spent from the sum of all entries", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue(FAKE_ITEM);
    prismaMock.spendingEntry.create.mockResolvedValue({ id: "e2", amount: 450 });
    // Amounts are integer cents: 10 + 20 = 30 exactly (the classic 0.1 + 0.2
    // float case, now drift-free).
    prismaMock.spendingEntry.findMany.mockResolvedValue([
      { amount: 10, direction: "debit" },
      { amount: 20, direction: "debit" },
    ]);
    prismaMock.spendingItem.update.mockResolvedValue({});

    const { status } = await readJson(await POST(jsonRequest(validBody)));
    expect(status).toBe(201);

    // The handler writes the exact integer-cent sum back to `spent`.
    const updateArg = prismaMock.spendingItem.update.mock.calls[0][0];
    expect(updateArg).toEqual({
      where: { id: "s1" },
      data: { spent: 30 },
    });
    expect(updateArg.data.spent).toBe(30);
  });

  it("400 when direction is not debit or credit", async () => {
    const { status, body } = await readJson(
      await POST(jsonRequest({ ...validBody, direction: "refund" }))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: 'Direction must be "debit" or "credit"' });
    expect(prismaMock.spendingEntry.create).not.toHaveBeenCalled();
  });

  it("defaults direction to debit when omitted", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue(FAKE_ITEM);
    prismaMock.spendingEntry.create.mockResolvedValue({ id: "e1" });
    prismaMock.spendingEntry.findMany.mockResolvedValue([]);
    prismaMock.spendingItem.update.mockResolvedValue({});

    await POST(jsonRequest(validBody));

    const arg = prismaMock.spendingEntry.create.mock.calls[0][0];
    expect(arg.data.direction).toBe("debit");
  });

  it("persists an explicit credit direction", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue(FAKE_ITEM);
    prismaMock.spendingEntry.create.mockResolvedValue({ id: "e1" });
    prismaMock.spendingEntry.findMany.mockResolvedValue([]);
    prismaMock.spendingItem.update.mockResolvedValue({});

    await POST(jsonRequest({ ...validBody, direction: "credit" }));

    const arg = prismaMock.spendingEntry.create.mock.calls[0][0];
    expect(arg.data.direction).toBe("credit");
  });

  it("recomputes spent as a signed sum over mixed directions", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue(FAKE_ITEM);
    prismaMock.spendingEntry.create.mockResolvedValue({ id: "e3" });
    // 200.00 debit + 150.00 credit → 50.00 (5000 cents), exact.
    prismaMock.spendingEntry.findMany.mockResolvedValue([
      { amount: 20_000, direction: "debit" },
      { amount: 15_000, direction: "credit" },
    ]);
    prismaMock.spendingItem.update.mockResolvedValue({});

    await POST(jsonRequest({ ...validBody, direction: "credit" }));

    expect(prismaMock.spendingItem.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { spent: 5_000 },
    });
  });

  it("persists a negative spent as-is when the card holds only a credit", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue(FAKE_ITEM);
    prismaMock.spendingEntry.create.mockResolvedValue({ id: "e1" });
    // Months-split case: the refund lands in a later month than the expense,
    // so that month's card holds only the credit. Negative spent is valid
    // data and must be stored unclamped.
    prismaMock.spendingEntry.findMany.mockResolvedValue([
      { amount: 15_000, direction: "credit" },
    ]);
    prismaMock.spendingItem.update.mockResolvedValue({});

    await POST(jsonRequest({ ...validBody, direction: "credit" }));

    expect(prismaMock.spendingItem.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { spent: -15_000 },
    });
  });

  it("defaults date to now when omitted", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue(FAKE_ITEM);
    prismaMock.spendingEntry.create.mockResolvedValue({ id: "e1" });
    prismaMock.spendingEntry.findMany.mockResolvedValue([]);
    prismaMock.spendingItem.update.mockResolvedValue({});

    await POST(jsonRequest(validBody));
    const arg = prismaMock.spendingEntry.create.mock.calls[0][0];
    expect(arg.data.date).toBeInstanceOf(Date);
  });

  it("attaches directly (no transaction) when the date is in the item's own month", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue({ ...FAKE_ITEM, month: "2026-06" });
    prismaMock.spendingEntry.create.mockResolvedValue({ id: "e1" });
    prismaMock.spendingEntry.findMany.mockResolvedValue([]);
    prismaMock.spendingItem.update.mockResolvedValue({});

    const { status } = await readJson(
      await POST(jsonRequest({ ...validBody, date: "2026-06-20" }))
    );

    expect(status).toBe(201);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.spendingItem.upsert).not.toHaveBeenCalled();
  });
});

describe("POST /api/entries — cross-month date routing (D19)", () => {
  const FAKE_CATEGORY = { id: "cat-1", label: "Food", icon: "fork", color: "#FF9500" };

  const dbItem = (id: string, month: string) => ({
    id,
    seriesId: "ser-1",
    month,
    budgeted: 0,
    spent: 0,
    note: null,
    series: {
      id: "ser-1",
      name: "Groceries",
      icon: "cart",
      recurring: true,
      userId: FAKE_USER.id,
      categoryId: "cat-1",
      category: FAKE_CATEGORY,
    },
    spendingEntries: [],
  });

  const routedBody = { ...validBody, date: "2026-07-15" };

  beforeEach(() => {
    prismaMock.spendingItem.findFirst.mockResolvedValue({ ...FAKE_ITEM, month: "2026-06" });
    prismaMock.spendingItem.upsert.mockResolvedValue({ id: "s2", seriesId: "ser-1", month: "2026-07" });
    prismaMock.spendingEntry.create.mockResolvedValue({ id: "e9", spendingItemId: "s2" });
    prismaMock.spendingEntry.findMany.mockResolvedValue([{ amount: 450, direction: "debit" }]);
    prismaMock.spendingItem.update.mockResolvedValue({});
    prismaMock.spendingItem.findUniqueOrThrow
      .mockResolvedValueOnce(dbItem("s1", "2026-06"))
      .mockResolvedValueOnce(dbItem("s2", "2026-07"));
  });

  it("finds-or-creates the target incarnation at budgeted 0 and attaches the entry there", async () => {
    const { status, body } = await readJson(await POST(jsonRequest(routedBody)));

    expect(status).toBe(201);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.spendingItem.upsert).toHaveBeenCalledWith({
      where: { seriesId_month: { seriesId: "ser-1", month: "2026-07" } },
      update: {},
      create: { seriesId: "ser-1", month: "2026-07", budgeted: 0 },
    });

    const entryArg = prismaMock.spendingEntry.create.mock.calls[0][0];
    expect(entryArg.data.spendingItemId).toBe("s2");

    // The target's spent is recomputed from its entries; the source never
    // held the entry, so it needs no recompute on create.
    expect(prismaMock.spendingItem.update).toHaveBeenCalledWith({
      where: { id: "s2" },
      data: { spent: 450 },
    });

    const routed = body as { entry: { id: string }; sourceItem: { id: string; month: string }; targetItem: { id: string; month: string; name: string } };
    expect(routed.entry.id).toBe("e9");
    expect(routed.sourceItem).toMatchObject({ id: "s1", month: "2026-06" });
    expect(routed.targetItem).toMatchObject({ id: "s2", month: "2026-07", name: "Groceries" });
  });

  it("persists a negative target spent unclamped when the routed entry is a credit", async () => {
    prismaMock.spendingEntry.findMany.mockResolvedValue([{ amount: 15_000, direction: "credit" }]);

    await POST(jsonRequest({ ...routedBody, direction: "credit", amount: 15_000 }));

    expect(prismaMock.spendingItem.update).toHaveBeenCalledWith({
      where: { id: "s2" },
      data: { spent: -15_000 },
    });
  });
});
