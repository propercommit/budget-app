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
    prismaMock: { category: model(), spendingItem: model() },
    getAuthenticatedUser: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUser }));

import { GET, POST } from "@/app/api/spending/route";

const validBody = {
  name: "Rent",
  icon: "home",
  categoryId: "cat-1",
  startDate: "2026-06-15",
};

beforeEach(() => {
  vi.clearAllMocks();
  getAuthenticatedUser.mockResolvedValue(FAKE_USER);
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
      { id: "s1", month: "2026-02", spendingEntries: [{ id: "e1" }] },
      { id: "s2", month: "2026-10", spendingEntries: [] },
      { id: "s3", month: "2026-02", spendingEntries: [] },
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

  it("lexicographic month keys preserve chronological order (2026-02 before 2026-10)", async () => {
    prismaMock.spendingItem.findMany.mockResolvedValue([
      { id: "s2", month: "2026-10", spendingEntries: [] },
      { id: "s1", month: "2026-02", spendingEntries: [] },
    ]);
    const { body } = await readJson(
      await GET(getRequest("http://localhost/api/spending"))
    );
    const keys = Object.keys(body as Record<string, unknown>).sort();
    expect(keys).toEqual(["2026-02", "2026-10"]);
  });

  it("passes the month filter through to Prisma when valid", async () => {
    prismaMock.spendingItem.findMany.mockResolvedValue([]);
    await GET(getRequest("http://localhost/api/spending?month=2026-06"));
    expect(prismaMock.spendingItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: FAKE_USER.id, month: "2026-06" },
      })
    );
  });
});

describe("POST /api/spending", () => {
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

  it("400 when startDate is not a valid date", async () => {
    const { status, body } = await readJson(
      await POST(jsonRequest({ ...validBody, startDate: "not-a-date" }))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "Start date must be a valid date" });
  });

  it("400 when endDate is not after startDate", async () => {
    const { status, body } = await readJson(
      await POST(
        jsonRequest({ ...validBody, endDate: "2026-06-15", startDate: "2026-06-15" })
      )
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "End date must be after start date" });
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

  it("404 when category does not belong to user", async () => {
    prismaMock.category.findFirst.mockResolvedValue(null);
    const { status, body } = await readJson(await POST(jsonRequest(validBody)));
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Category not found" });
    expect(prismaMock.spendingItem.create).not.toHaveBeenCalled();
  });

  it("derives a zero-padded YYYY-MM month from startDate", async () => {
    prismaMock.category.findFirst.mockResolvedValue({ id: "cat-1" });
    prismaMock.spendingItem.create.mockResolvedValue({
      id: "s1",
      spendingEntries: [],
    });

    // March → month index 2 → must render as "03", not "3".
    await POST(jsonRequest({ ...validBody, startDate: "2026-03-09" }));

    const arg = prismaMock.spendingItem.create.mock.calls[0][0];
    expect(arg.data.month).toBe("2026-03");
  });

  it("creates the item, defaults budgeted/spent to 0, and aliases entries", async () => {
    prismaMock.category.findFirst.mockResolvedValue({ id: "cat-1" });
    prismaMock.spendingItem.create.mockResolvedValue({
      id: "s1",
      name: "Rent",
      spendingEntries: [{ id: "e1" }],
    });

    const { status, body } = await readJson(await POST(jsonRequest(validBody)));

    expect(status).toBe(201);
    const arg = prismaMock.spendingItem.create.mock.calls[0][0];
    expect(arg.data.budgeted).toBe(0);
    expect(arg.data.spent).toBe(0);
    expect(arg.data.userId).toBe(FAKE_USER.id);
    expect((body as { entries: unknown[] }).entries).toEqual([{ id: "e1" }]);
  });

  it("accepts and persists a negative spent (signed)", async () => {
    prismaMock.category.findFirst.mockResolvedValue({ id: "cat-1" });
    prismaMock.spendingItem.create.mockResolvedValue({
      id: "s1",
      spendingEntries: [],
    });

    const { status } = await readJson(
      await POST(jsonRequest({ ...validBody, spent: -15_000 }))
    );
    expect(status).toBe(201);

    const arg = prismaMock.spendingItem.create.mock.calls[0][0];
    expect(arg.data.spent).toBe(-15_000);
  });

  // SpendingItem has @@unique([userId, name, month]); a duplicate raises a Prisma
  // P2002, which the route translates into a friendly 409 rather than a 500.
  it("translates a duplicate (name,month) P2002 into a 409", async () => {
    prismaMock.category.findFirst.mockResolvedValue({ id: "cat-1" });
    const p2002 = new PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "6",
    });
    prismaMock.spendingItem.create.mockRejectedValue(p2002);

    const { status, body } = await readJson(await POST(jsonRequest(validBody)));
    expect(status).toBe(409);
    expect(body).toEqual({
      error: "A spending item with this name already exists for this month",
    });
  });
});
