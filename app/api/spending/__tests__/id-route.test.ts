import { describe, it, expect, beforeEach, vi } from "vitest";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import {
  FAKE_USER,
  jsonRequest,
  getRequest,
  routeContext,
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

import { PUT, DELETE } from "@/app/api/spending/[id]/route";

const FAKE_CATEGORY = { id: "cat-1", label: "Housing", icon: "home", color: "#007AFF" };

const FAKE_SERIES = {
  id: "ser-1",
  name: "Rent",
  icon: "home",
  recurring: true,
  userId: FAKE_USER.id,
  categoryId: FAKE_CATEGORY.id,
};

const EXISTING_ITEM = { id: "s1", seriesId: "ser-1", month: "2026-06", budgeted: 0, spent: 0, note: null };

/** What the post-update reload returns (series include shape). */
const reloadedItem = (over: Record<string, unknown> = {}) => ({
  ...EXISTING_ITEM,
  series: { ...FAKE_SERIES, category: FAKE_CATEGORY },
  spendingEntries: [],
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  getAuthenticatedUser.mockResolvedValue(FAKE_USER);
  prismaMock.$transaction.mockImplementation(
    async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock)
  );
  prismaMock.spendingItem.findUniqueOrThrow.mockResolvedValue(reloadedItem());
});

describe("PUT /api/spending/[id]", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const res = await PUT(jsonRequest({ name: "X" }), routeContext("s1"));
    expect((await readJson(res)).status).toBe(401);
  });

  it("400 when no fields provided", async () => {
    const { status, body } = await readJson(
      await PUT(jsonRequest({}), routeContext("s1"))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "At least one field is required to update" });
  });

  // month is identity + partition (D18); spent is owned by the entries
  // recompute. Neither is updatable here, so a body carrying only those (plus
  // the legacy date fields) has nothing to apply.
  it("400 when only non-updatable fields are provided (month/startDate/endDate/spent)", async () => {
    const { status, body } = await readJson(
      await PUT(
        jsonRequest({ month: "2027-01", startDate: "2027-01-05", endDate: null, spent: -1 }),
        routeContext("s1")
      )
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "At least one field is required to update" });
    expect(prismaMock.spendingItem.update).not.toHaveBeenCalled();
  });

  it("404 when item not found (ownership traversed through the series)", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue(null);
    const { status, body } = await readJson(
      await PUT(jsonRequest({ name: "X" }), routeContext("s1"))
    );
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Spending item not found" });
    expect(prismaMock.spendingItem.findFirst).toHaveBeenCalledWith({
      where: { id: "s1", series: { userId: FAKE_USER.id } },
    });
  });

  it("404 when the new categoryId does not belong to the user", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue(EXISTING_ITEM);
    prismaMock.category.findFirst.mockResolvedValue(null);
    const { status, body } = await readJson(
      await PUT(jsonRequest({ categoryId: "other" }), routeContext("s1"))
    );
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Category not found" });
  });

  it("routes name/icon/categoryId to the series — a global edit (D21)", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue(EXISTING_ITEM);
    prismaMock.category.findFirst.mockResolvedValue(FAKE_CATEGORY);

    const { status } = await readJson(
      await PUT(
        jsonRequest({ name: "  New name  ", icon: "zap", categoryId: "cat-1" }),
        routeContext("s1")
      )
    );

    expect(status).toBe(200);
    expect(prismaMock.budgetSeries.update).toHaveBeenCalledWith({
      where: { id: "ser-1" },
      data: { name: "New name", icon: "zap", categoryId: "cat-1" },
    });
    // No incarnation fields were sent, so the item row is untouched.
    expect(prismaMock.spendingItem.update).not.toHaveBeenCalled();
  });

  it("routes budgeted/note to the incarnation only", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue(EXISTING_ITEM);

    await PUT(jsonRequest({ budgeted: 12_300, note: "monthly" }), routeContext("s1"));

    expect(prismaMock.spendingItem.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { budgeted: 12_300, note: "monthly" },
    });
    expect(prismaMock.budgetSeries.update).not.toHaveBeenCalled();
  });

  it("ignores month/startDate riders on an otherwise valid update (D18)", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue(EXISTING_ITEM);

    await PUT(
      jsonRequest({ budgeted: 500, month: "2027-01", startDate: "2027-01-05" }),
      routeContext("s1")
    );

    const arg = prismaMock.spendingItem.update.mock.calls[0][0];
    expect(arg.data).toEqual({ budgeted: 500 });
  });

  // Renaming collides globally on @@unique([userId, name]) — with any other
  // series of the user's, active or dormant.
  it("translates a rename P2002 into a friendly 409", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue(EXISTING_ITEM);
    const p2002 = new PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "6",
    });
    prismaMock.budgetSeries.update.mockRejectedValue(p2002);

    const { status, body } = await readJson(
      await PUT(jsonRequest({ name: "Netflix" }), routeContext("s1"))
    );

    expect(status).toBe(409);
    expect(body).toEqual({ error: "You already have a budget item with this name" });
  });

  it("responds with the flattened item (series fields lifted, entries aliased)", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue(EXISTING_ITEM);
    prismaMock.spendingItem.findUniqueOrThrow.mockResolvedValue(
      reloadedItem({ spendingEntries: [{ id: "e1" }] })
    );

    const { body } = await readJson(
      await PUT(jsonRequest({ budgeted: 100 }), routeContext("s1"))
    );

    const flat = body as Record<string, unknown>;
    expect(flat.name).toBe("Rent");
    expect(flat.seriesId).toBe("ser-1");
    expect(flat.category).toEqual(FAKE_CATEGORY);
    expect(flat.entries).toEqual([{ id: "e1" }]);
    expect(flat.series).toBeUndefined();
  });
});

describe("DELETE /api/spending/[id]", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const res = await DELETE(getRequest("http://localhost"), routeContext("s1"));
    expect((await readJson(res)).status).toBe(401);
  });

  it("404 when item not found (ownership traversed through the series)", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue(null);
    const { status, body } = await readJson(
      await DELETE(getRequest("http://localhost"), routeContext("s1"))
    );
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Spending item not found" });
    expect(prismaMock.spendingItem.findFirst).toHaveBeenCalledWith({
      where: { id: "s1", series: { userId: FAKE_USER.id } },
    });
    expect(prismaMock.spendingItem.delete).not.toHaveBeenCalled();
  });

  it("deletes only the incarnation and returns success — the series survives", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue(EXISTING_ITEM);
    prismaMock.spendingItem.delete.mockResolvedValue(EXISTING_ITEM);
    const { status, body } = await readJson(
      await DELETE(getRequest("http://localhost"), routeContext("s1"))
    );
    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(prismaMock.budgetSeries.delete).not.toHaveBeenCalled();
  });
});
