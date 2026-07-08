import { describe, it, expect, beforeEach, vi } from "vitest";
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
      spendingItem: model(),
      spendingEntry: model(),
      $transaction: vi.fn(),
    },
    getAuthenticatedUser: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUser }));

import { PUT, DELETE } from "@/app/api/entries/[id]/route";

// The stored entry sits in June 2026; a date payload in another month routes it.
const FAKE_ENTRY = {
  id: "e1",
  spendingItemId: "s1",
  date: new Date("2026-06-10T00:00:00.000Z"),
  spendingItem: { id: "s1", seriesId: "ser-1", month: "2026-06", series: { userId: FAKE_USER.id } },
};

beforeEach(() => {
  vi.clearAllMocks();
  getAuthenticatedUser.mockResolvedValue(FAKE_USER);
  prismaMock.$transaction.mockImplementation(
    async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock)
  );
});

describe("PUT /api/entries/[id]", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const res = await PUT(jsonRequest({ name: "X" }), routeContext("e1"));
    expect((await readJson(res)).status).toBe(401);
  });

  it("400 when no fields provided", async () => {
    const { status, body } = await readJson(
      await PUT(jsonRequest({}), routeContext("e1"))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "At least one field is required to update" });
  });

  it("404 when entry does not exist", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue(null);
    const { status, body } = await readJson(
      await PUT(jsonRequest({ name: "X" }), routeContext("e1"))
    );
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Entry not found" });
  });

  it("404 (not 403) when entry belongs to another user — ownership via spendingItem", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue({
      id: "e1",
      spendingItemId: "s1",
      spendingItem: { series: { userId: "someone-else" } },
    });
    const { status, body } = await readJson(
      await PUT(jsonRequest({ name: "X" }), routeContext("e1"))
    );
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Entry not found" });
    expect(prismaMock.spendingEntry.update).not.toHaveBeenCalled();
  });

  it("updates the entry and does NOT recompute spent when amount is unchanged", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue(FAKE_ENTRY);
    prismaMock.spendingEntry.update.mockResolvedValue({ id: "e1", name: "New" });

    const { status } = await readJson(
      await PUT(jsonRequest({ name: "New" }), routeContext("e1"))
    );
    expect(status).toBe(200);
    // spent recompute only runs when `amount` or `direction` is in the payload
    expect(prismaMock.spendingItem.update).not.toHaveBeenCalled();
  });

  it("recomputes spent as an exact cent sum when amount changes", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue(FAKE_ENTRY);
    prismaMock.spendingEntry.update.mockResolvedValue({ id: "e1" });
    // Amounts are integer cents: 1010 + 2020 = 3030 exactly (was 10.1 + 20.2
    // which drifts as floats).
    prismaMock.spendingEntry.findMany.mockResolvedValue([
      { amount: 1010, direction: "debit" },
      { amount: 2020, direction: "debit" },
    ]);
    prismaMock.spendingItem.update.mockResolvedValue({});

    await PUT(jsonRequest({ amount: 2020 }), routeContext("e1"));

    const arg = prismaMock.spendingItem.update.mock.calls[0][0];
    expect(arg).toEqual({ where: { id: "s1" }, data: { spent: 3030 } });
    expect(arg.data.spent).toBe(3030);
  });

  it("400 when direction is invalid", async () => {
    const { status, body } = await readJson(
      await PUT(jsonRequest({ direction: "reversal" }), routeContext("e1"))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: 'Direction must be "debit" or "credit"' });
    expect(prismaMock.spendingEntry.update).not.toHaveBeenCalled();
  });

  it("persists a direction change and recomputes spent as a signed sum", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue(FAKE_ENTRY);
    prismaMock.spendingEntry.update.mockResolvedValue({ id: "e1" });
    // Flipping the lone entry to credit turns spent negative — persisted as-is.
    prismaMock.spendingEntry.findMany.mockResolvedValue([
      { amount: 425, direction: "credit" },
    ]);
    prismaMock.spendingItem.update.mockResolvedValue({});

    await PUT(jsonRequest({ direction: "credit" }), routeContext("e1"));

    const entryArg = prismaMock.spendingEntry.update.mock.calls[0][0];
    expect(entryArg.data.direction).toBe("credit");

    expect(prismaMock.spendingItem.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { spent: -425 },
    });
  });

  it("keeps a same-month date change in place — no move, no recompute", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue(FAKE_ENTRY);
    prismaMock.spendingEntry.update.mockResolvedValue({ id: "e1" });

    const { status } = await readJson(
      await PUT(jsonRequest({ date: "2026-06-25" }), routeContext("e1"))
    );

    expect(status).toBe(200);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.spendingItem.upsert).not.toHaveBeenCalled();
    expect(prismaMock.spendingItem.update).not.toHaveBeenCalled();
  });
});

describe("PUT /api/entries/[id] — cross-month date routing (D19)", () => {
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

  beforeEach(() => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue(FAKE_ENTRY);
    prismaMock.spendingItem.upsert.mockResolvedValue({ id: "s2", seriesId: "ser-1", month: "2026-07" });
    prismaMock.spendingEntry.update.mockResolvedValue({ id: "e1", spendingItemId: "s2" });
    prismaMock.spendingItem.update.mockResolvedValue({});
    prismaMock.spendingItem.findUniqueOrThrow
      .mockResolvedValueOnce(dbItem("s1", "2026-06"))
      .mockResolvedValueOnce(dbItem("s2", "2026-07"));
  });

  it("moves the entry to the new date's incarnation and recomputes BOTH spent values", async () => {
    // Source keeps a lone credit after losing this entry (negative, unclamped);
    // the target now holds the moved 450 debit.
    prismaMock.spendingEntry.findMany
      .mockResolvedValueOnce([{ amount: 15_000, direction: "credit" }])
      .mockResolvedValueOnce([{ amount: 450, direction: "debit" }]);

    const { status, body } = await readJson(
      await PUT(jsonRequest({ date: "2026-07-15" }), routeContext("e1"))
    );

    expect(status).toBe(200);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.spendingItem.upsert).toHaveBeenCalledWith({
      where: { seriesId_month: { seriesId: "ser-1", month: "2026-07" } },
      update: {},
      create: { seriesId: "ser-1", month: "2026-07", budgeted: 0 },
    });

    const entryArg = prismaMock.spendingEntry.update.mock.calls[0][0];
    expect(entryArg.data.spendingItemId).toBe("s2");
    expect(entryArg.data.date).toBeInstanceOf(Date);

    expect(prismaMock.spendingItem.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { spent: -15_000 },
    });
    expect(prismaMock.spendingItem.update).toHaveBeenCalledWith({
      where: { id: "s2" },
      data: { spent: 450 },
    });

    const routed = body as { entry: { id: string }; sourceItem: { id: string; month: string }; targetItem: { id: string; month: string; name: string } };
    expect(routed.entry.id).toBe("e1");
    expect(routed.sourceItem).toMatchObject({ id: "s1", month: "2026-06" });
    expect(routed.targetItem).toMatchObject({ id: "s2", month: "2026-07", name: "Groceries" });
  });

  it("routes on a combined date+amount change with both recomputes in the transaction", async () => {
    prismaMock.spendingEntry.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ amount: 999, direction: "debit" }]);

    await PUT(jsonRequest({ date: "2026-07-15", amount: 999 }), routeContext("e1"));

    expect(prismaMock.spendingItem.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { spent: 0 },
    });
    expect(prismaMock.spendingItem.update).toHaveBeenCalledWith({
      where: { id: "s2" },
      data: { spent: 999 },
    });
  });
});

describe("DELETE /api/entries/[id]", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const res = await DELETE(getRequest("http://localhost"), routeContext("e1"));
    expect((await readJson(res)).status).toBe(401);
  });

  it("404 when entry not found", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue(null);
    const { status, body } = await readJson(
      await DELETE(getRequest("http://localhost"), routeContext("e1"))
    );
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Entry not found" });
  });

  it("404 when entry belongs to another user", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue({
      id: "e1",
      spendingItemId: "s1",
      spendingItem: { series: { userId: "someone-else" } },
    });
    const { status } = await readJson(
      await DELETE(getRequest("http://localhost"), routeContext("e1"))
    );
    expect(status).toBe(404);
    expect(prismaMock.spendingEntry.delete).not.toHaveBeenCalled();
  });

  it("deletes the entry then recomputes spent from the remaining entries", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue(FAKE_ENTRY);
    prismaMock.spendingEntry.delete.mockResolvedValue({ id: "e1" });
    prismaMock.spendingEntry.findMany.mockResolvedValue([{ amount: 500, direction: "debit" }]);
    prismaMock.spendingItem.update.mockResolvedValue({});

    const { status, body } = await readJson(
      await DELETE(getRequest("http://localhost"), routeContext("e1"))
    );
    expect(status).toBe(200);
    expect(body).toEqual({ success: true });

    // delete must precede the spent recompute
    const deleteOrder = prismaMock.spendingEntry.delete.mock.invocationCallOrder[0];
    const updateOrder = prismaMock.spendingItem.update.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(updateOrder);
    expect(prismaMock.spendingItem.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { spent: 500 },
    });
  });

  it("persists a negative spent when only credits remain after the delete", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue(FAKE_ENTRY);
    prismaMock.spendingEntry.delete.mockResolvedValue({ id: "e1" });
    // Deleting the offsetting debit leaves a lone 150.00 credit → -15000,
    // stored unclamped.
    prismaMock.spendingEntry.findMany.mockResolvedValue([
      { amount: 15_000, direction: "credit" },
    ]);
    prismaMock.spendingItem.update.mockResolvedValue({});

    await DELETE(getRequest("http://localhost"), routeContext("e1"));

    expect(prismaMock.spendingItem.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { spent: -15_000 },
    });
  });
});
