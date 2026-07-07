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
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
  });
  return {
    prismaMock: { spendingItem: model(), spendingEntry: model() },
    getAuthenticatedUser: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUser }));

import { PUT, DELETE } from "@/app/api/entries/[id]/route";

beforeEach(() => {
  vi.clearAllMocks();
  getAuthenticatedUser.mockResolvedValue(FAKE_USER);
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
    prismaMock.spendingEntry.findUnique.mockResolvedValue({
      id: "e1",
      spendingItemId: "s1",
      spendingItem: { series: { userId: FAKE_USER.id } },
    });
    prismaMock.spendingEntry.update.mockResolvedValue({ id: "e1", name: "New" });

    const { status } = await readJson(
      await PUT(jsonRequest({ name: "New" }), routeContext("e1"))
    );
    expect(status).toBe(200);
    // spent recompute only runs when `amount` or `direction` is in the payload
    expect(prismaMock.spendingItem.update).not.toHaveBeenCalled();
  });

  it("recomputes spent as an exact cent sum when amount changes", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue({
      id: "e1",
      spendingItemId: "s1",
      spendingItem: { series: { userId: FAKE_USER.id } },
    });
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
    prismaMock.spendingEntry.findUnique.mockResolvedValue({
      id: "e1",
      spendingItemId: "s1",
      spendingItem: { series: { userId: FAKE_USER.id } },
    });
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
    prismaMock.spendingEntry.findUnique.mockResolvedValue({
      id: "e1",
      spendingItemId: "s1",
      spendingItem: { series: { userId: FAKE_USER.id } },
    });
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
    prismaMock.spendingEntry.findUnique.mockResolvedValue({
      id: "e1",
      spendingItemId: "s1",
      spendingItem: { series: { userId: FAKE_USER.id } },
    });
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
