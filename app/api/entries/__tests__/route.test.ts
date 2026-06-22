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

import { GET, POST } from "@/app/api/entries/route";

const validBody = { spendingItemId: "s1", name: "Coffee", amount: 4.5 };

beforeEach(() => {
  vi.clearAllMocks();
  getAuthenticatedUser.mockResolvedValue(FAKE_USER);
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
    prismaMock.spendingItem.findFirst.mockResolvedValue({ id: "s1" });
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
    prismaMock.spendingItem.findFirst.mockResolvedValue({ id: "s1" });
    prismaMock.spendingEntry.create.mockResolvedValue({ id: "e1" });
    prismaMock.spendingEntry.findMany.mockResolvedValue([{ amount: 4.5 }]);
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
    prismaMock.spendingItem.findFirst.mockResolvedValue({ id: "s1" });
    prismaMock.spendingEntry.create.mockResolvedValue({ id: "e2", amount: 4.5 });
    // Two existing entries summing with float error: 0.1 + 0.2 = 0.30000000000000004
    prismaMock.spendingEntry.findMany.mockResolvedValue([
      { amount: 0.1 },
      { amount: 0.2 },
    ]);
    prismaMock.spendingItem.update.mockResolvedValue({});

    const { status } = await readJson(await POST(jsonRequest(validBody)));
    expect(status).toBe(201);

    // The handler writes the raw float sum back to `spent`; assert the actual
    // (float-error-carrying) value it computes, not a rounded ideal.
    const updateArg = prismaMock.spendingItem.update.mock.calls[0][0];
    expect(updateArg).toEqual({
      where: { id: "s1" },
      data: { spent: 0.1 + 0.2 },
    });
    expect(updateArg.data.spent).toBeCloseTo(0.3, 10);
  });

  it("defaults date to now when omitted", async () => {
    prismaMock.spendingItem.findFirst.mockResolvedValue({ id: "s1" });
    prismaMock.spendingEntry.create.mockResolvedValue({ id: "e1" });
    prismaMock.spendingEntry.findMany.mockResolvedValue([]);
    prismaMock.spendingItem.update.mockResolvedValue({});

    await POST(jsonRequest(validBody));
    const arg = prismaMock.spendingEntry.create.mock.calls[0][0];
    expect(arg.data.date).toBeInstanceOf(Date);
  });
});
