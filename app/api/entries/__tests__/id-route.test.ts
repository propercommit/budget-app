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
      spendingItem: { userId: "someone-else" },
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
      spendingItem: { userId: FAKE_USER.id },
    });
    prismaMock.spendingEntry.update.mockResolvedValue({ id: "e1", name: "New" });

    const { status } = await readJson(
      await PUT(jsonRequest({ name: "New" }), routeContext("e1"))
    );
    expect(status).toBe(200);
    // spent recompute only runs when `amount` is in the payload
    expect(prismaMock.spendingItem.update).not.toHaveBeenCalled();
  });

  it("recomputes spent (with float sum) when amount changes", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue({
      id: "e1",
      spendingItemId: "s1",
      spendingItem: { userId: FAKE_USER.id },
    });
    prismaMock.spendingEntry.update.mockResolvedValue({ id: "e1" });
    prismaMock.spendingEntry.findMany.mockResolvedValue([
      { amount: 10.1 },
      { amount: 20.2 },
    ]);
    prismaMock.spendingItem.update.mockResolvedValue({});

    await PUT(jsonRequest({ amount: 20.2 }), routeContext("e1"));

    const arg = prismaMock.spendingItem.update.mock.calls[0][0];
    expect(arg).toEqual({ where: { id: "s1" }, data: { spent: 10.1 + 20.2 } });
    expect(arg.data.spent).toBeCloseTo(30.3, 10);
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
      spendingItem: { userId: "someone-else" },
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
      spendingItem: { userId: FAKE_USER.id },
    });
    prismaMock.spendingEntry.delete.mockResolvedValue({ id: "e1" });
    prismaMock.spendingEntry.findMany.mockResolvedValue([{ amount: 5 }]);
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
      data: { spent: 5 },
    });
  });
});
