import { describe, it, expect, beforeEach, vi } from "vitest";
import { FAKE_USER, readJson } from "../../__tests__/helpers";

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
    prismaMock: { incomeSource: model(), user: model() },
    getAuthenticatedUser: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUser }));

import { GET, POST, PUT, DELETE } from "@/app/api/income/route";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

// The income route uses `NextRequest` (req.nextUrl). Build one for GET.
import { NextRequest } from "next/server";

function jsonReq(body: unknown, method = "POST"): Request {
  return new Request("http://localhost/api/income", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validIncome = {
  name: "Salary",
  amount: 5000,
  icon: "briefcase",
  type: "active",
  startDate: "2026-06-01",
  month: "2026-06",
};

beforeEach(() => {
  vi.clearAllMocks();
  getAuthenticatedUser.mockResolvedValue(FAKE_USER);
});

describe("GET /api/income", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const { status } = await readJson(
      await GET(new NextRequest("http://localhost/api/income"))
    );
    expect(status).toBe(401);
  });

  it("returns all income when no month query", async () => {
    prismaMock.incomeSource.findMany.mockResolvedValue([{ id: "i1" }]);
    const { status, body } = await readJson(
      await GET(new NextRequest("http://localhost/api/income"))
    );
    expect(status).toBe(200);
    expect(body).toEqual([{ id: "i1" }]);
    expect(prismaMock.incomeSource.findMany).toHaveBeenCalledWith({
      where: { userId: FAKE_USER.id },
    });
  });

  it("filters by month when provided", async () => {
    prismaMock.incomeSource.findMany.mockResolvedValue([]);
    await GET(new NextRequest("http://localhost/api/income?month=2026-06"));
    expect(prismaMock.incomeSource.findMany).toHaveBeenCalledWith({
      where: { userId: FAKE_USER.id, month: "2026-06" },
    });
  });
});

describe("POST /api/income", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const { status } = await readJson(await POST(jsonReq(validIncome)));
    expect(status).toBe(401);
  });

  it("400 when name is not a string", async () => {
    const { status, body } = await readJson(
      await POST(jsonReq({ ...validIncome, name: 123 }))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "name must be a string" });
  });

  it("400 when amount is not a number", async () => {
    const { status, body } = await readJson(
      await POST(jsonReq({ ...validIncome, amount: "5000" }))
    );
    expect(status).toBe(400);
    expect(body).toEqual({
      error: "amount field type not correct, should be of type number",
    });
  });

  it("400 when type is neither active nor passive", async () => {
    const { status, body } = await readJson(
      await POST(jsonReq({ ...validIncome, type: "weird" }))
    );
    expect(status).toBe(400);
    expect(body).toEqual({
      error: "Required field type value received is not correct",
    });
  });

  it("400 when month is missing", async () => {
    const { status, body } = await readJson(
      await POST(jsonReq({ ...validIncome, month: undefined }))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "Required field month is missing" });
  });

  it("400 when startDate is not a valid date", async () => {
    const { status, body } = await readJson(
      await POST(jsonReq({ ...validIncome, startDate: "nope" }))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "startDate is not a valid date" });
  });

  it("400 when name exceeds 100 chars", async () => {
    const { status, body } = await readJson(
      await POST(jsonReq({ ...validIncome, name: "a".repeat(101) }))
    );
    expect(status).toBe(400);
    expect(body).toEqual({
      error: "name field is too long, maximum 100 characters allowed",
    });
  });

  it("creates income and returns 201", async () => {
    prismaMock.incomeSource.create.mockResolvedValue({ id: "i1" });
    const { status, body } = await readJson(await POST(jsonReq(validIncome)));
    expect(status).toBe(201);
    expect(body).toEqual({ id: "i1" });
    expect(prismaMock.incomeSource.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: FAKE_USER.id, name: "Salary" }),
    });
  });

  // Income requires no pre-existing category, so it can be a virgin account's
  // first write — the route must self-heal the User row before the FK write.
  it("upserts the User before creating the income source", async () => {
    prismaMock.user.upsert.mockResolvedValue({});
    prismaMock.incomeSource.create.mockResolvedValue({ id: "i1" });

    const { status } = await readJson(await POST(jsonReq(validIncome)));

    expect(status).toBe(201);
    expect(prismaMock.user.upsert).toHaveBeenCalledWith({
      where: { id: FAKE_USER.id },
      update: { email: FAKE_USER.email },
      create: { id: FAKE_USER.id, email: FAKE_USER.email },
    });

    // upsert must precede create
    const upsertOrder = prismaMock.user.upsert.mock.invocationCallOrder[0];
    const createOrder = prismaMock.incomeSource.create.mock.invocationCallOrder[0];
    expect(upsertOrder).toBeLessThan(createOrder);
  });
});

describe("PUT /api/income", () => {
  it("400 when id is missing", async () => {
    const { status, body } = await readJson(
      await PUT(jsonReq({ name: "X" }, "PUT"))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "id is required" });
  });

  it("builds a partial update from only the valid provided fields", async () => {
    prismaMock.incomeSource.update.mockResolvedValue({ id: "i1" });
    await PUT(jsonReq({ id: "i1", name: "Raise", amount: -5, icon: "" }, "PUT"));
    const arg = prismaMock.incomeSource.update.mock.calls[0][0];
    // name is applied; amount<0 and empty icon are filtered out
    expect(arg.data).toEqual({ name: "Raise" });
    expect(arg.where).toEqual({ id: "i1", userId: FAKE_USER.id });
  });

  it("translates Prisma P2025 into a 404", async () => {
    const p2025 = new PrismaClientKnownRequestError("not found", {
      code: "P2025",
      clientVersion: "6",
    });
    prismaMock.incomeSource.update.mockRejectedValue(p2025);
    const { status, body } = await readJson(
      await PUT(jsonReq({ id: "missing", name: "X" }, "PUT"))
    );
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Income source not found" });
  });
});

describe("DELETE /api/income", () => {
  it("400 when id is missing", async () => {
    const { status, body } = await readJson(
      await DELETE(jsonReq({}, "DELETE"))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "id is required" });
  });

  it("returns 204 with no body on success", async () => {
    prismaMock.incomeSource.delete.mockResolvedValue({ id: "i1" });
    const res = await DELETE(jsonReq({ id: "i1" }, "DELETE"));
    expect(res.status).toBe(204);
    expect(prismaMock.incomeSource.delete).toHaveBeenCalledWith({
      where: { id: "i1", userId: FAKE_USER.id },
    });
  });

  it("translates Prisma P2025 into a 404", async () => {
    const p2025 = new PrismaClientKnownRequestError("not found", {
      code: "P2025",
      clientVersion: "6",
    });
    prismaMock.incomeSource.delete.mockRejectedValue(p2025);
    const { status, body } = await readJson(
      await DELETE(jsonReq({ id: "missing" }, "DELETE"))
    );
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Income source not found" });
  });
});
