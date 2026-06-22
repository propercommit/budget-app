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
    prismaMock: { category: model(), spendingItem: model() },
    getAuthenticatedUser: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUser }));

import { PUT, DELETE } from "@/app/api/spending/[id]/route";

beforeEach(() => {
  vi.clearAllMocks();
  getAuthenticatedUser.mockResolvedValue(FAKE_USER);
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

  it("400 when spent is out of range", async () => {
    const { status, body } = await readJson(
      await PUT(jsonRequest({ spent: -1 }), routeContext("s1"))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "Spent must be between 0 and 100,000,000" });
  });

  it("404 when item not found", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue(null);
    const { status, body } = await readJson(
      await PUT(jsonRequest({ name: "X" }), routeContext("s1"))
    );
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Spending item not found" });
  });

  it("404 when the new categoryId does not belong to the user", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue({ id: "s1" });
    prismaMock.category.findFirst.mockResolvedValue(null);
    const { status, body } = await readJson(
      await PUT(jsonRequest({ categoryId: "other" }), routeContext("s1"))
    );
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Category not found" });
  });

  it("recomputes month when startDate changes (zero-padded)", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue({ id: "s1" });
    prismaMock.spendingItem.update.mockResolvedValue({
      id: "s1",
      spendingEntries: [],
    });

    await PUT(jsonRequest({ startDate: "2026-01-20" }), routeContext("s1"));

    const arg = prismaMock.spendingItem.update.mock.calls[0][0];
    expect(arg.data.month).toBe("2026-01");
    expect(arg.data.startDate).toBeInstanceOf(Date);
  });

  it("clears endDate when passed null", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue({ id: "s1" });
    prismaMock.spendingItem.update.mockResolvedValue({
      id: "s1",
      spendingEntries: [],
    });

    await PUT(jsonRequest({ endDate: null }), routeContext("s1"));

    const arg = prismaMock.spendingItem.update.mock.calls[0][0];
    expect(arg.data.endDate).toBeNull();
  });

  it("aliases spendingEntries → entries in the response", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue({ id: "s1" });
    prismaMock.spendingItem.update.mockResolvedValue({
      id: "s1",
      spendingEntries: [{ id: "e1" }],
    });
    const { body } = await readJson(
      await PUT(jsonRequest({ name: "New" }), routeContext("s1"))
    );
    expect((body as { entries: unknown[] }).entries).toEqual([{ id: "e1" }]);
  });
});

describe("DELETE /api/spending/[id]", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const res = await DELETE(getRequest("http://localhost"), routeContext("s1"));
    expect((await readJson(res)).status).toBe(401);
  });

  it("404 when item not found", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue(null);
    const { status, body } = await readJson(
      await DELETE(getRequest("http://localhost"), routeContext("s1"))
    );
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Spending item not found" });
    expect(prismaMock.spendingItem.delete).not.toHaveBeenCalled();
  });

  it("deletes and returns success", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue({ id: "s1" });
    prismaMock.spendingItem.delete.mockResolvedValue({ id: "s1" });
    const { status, body } = await readJson(
      await DELETE(getRequest("http://localhost"), routeContext("s1"))
    );
    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
  });
});
