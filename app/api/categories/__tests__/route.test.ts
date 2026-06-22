import { describe, it, expect, beforeEach, vi } from "vitest";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { FAKE_USER, jsonRequest, readJson } from "../../__tests__/helpers";

// --- Boundary mocks -------------------------------------------------------
// `vi.mock` factories and `vi.hoisted` are lifted to the top of the module, so
// the mock instances are created inside `vi.hoisted` and the Prisma mock is
// built inline there (an imported factory wouldn't be initialised yet).
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
      user: model(),
      category: model(),
      spendingItem: model(),
      spendingEntry: model(),
      incomeSource: model(),
      userSettings: model(),
    },
    getAuthenticatedUser: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUser }));

// Imported after mocks are registered.
import { GET, POST } from "@/app/api/categories/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/categories", () => {
  it("returns 401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const { status, body } = await readJson(await GET());
    expect(status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
    expect(prismaMock.category.findMany).not.toHaveBeenCalled();
  });

  it("returns the user's categories ordered by createdAt asc", async () => {
    getAuthenticatedUser.mockResolvedValue(FAKE_USER);
    const rows = [{ id: "c1", label: "Food" }];
    prismaMock.category.findMany.mockResolvedValue(rows);

    const { status, body } = await readJson(await GET());

    expect(status).toBe(200);
    expect(body).toEqual(rows);
    expect(prismaMock.category.findMany).toHaveBeenCalledWith({
      where: { userId: FAKE_USER.id },
      orderBy: { createdAt: "asc" },
    });
  });

  it("returns 500 when Prisma throws", async () => {
    getAuthenticatedUser.mockResolvedValue(FAKE_USER);
    prismaMock.category.findMany.mockRejectedValue(new Error("db down"));
    const { status, body } = await readJson(await GET());
    expect(status).toBe(500);
    expect(body).toEqual({ error: "Failed to fetch categories" });
  });
});

describe("POST /api/categories", () => {
  beforeEach(() => {
    getAuthenticatedUser.mockResolvedValue(FAKE_USER);
  });

  it("returns 401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const req = jsonRequest({ label: "Food", icon: "x", color: "#FF5733" });
    const { status } = await readJson(await POST(req));
    expect(status).toBe(401);
    expect(prismaMock.category.create).not.toHaveBeenCalled();
  });

  it("400 when label is missing/blank", async () => {
    const { status, body } = await readJson(
      await POST(jsonRequest({ icon: "x", color: "#FF5733" }))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "Label is required" });
  });

  it("400 when label is whitespace only", async () => {
    const { status, body } = await readJson(
      await POST(jsonRequest({ label: "   ", icon: "x", color: "#FF5733" }))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "Label is required" });
  });

  it("400 when icon is missing", async () => {
    const { status, body } = await readJson(
      await POST(jsonRequest({ label: "Food", color: "#FF5733" }))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "Icon is required" });
  });

  it.each([
    ["FF5733", "missing leading #"],
    ["#FF573", "only 5 hex digits"],
    ["#GGGGGG", "non-hex characters"],
    ["#FF5733FF", "too many digits"],
  ])("400 when color is invalid (%s — %s)", async (color) => {
    const { status, body } = await readJson(
      await POST(jsonRequest({ label: "Food", icon: "x", color }))
    );
    expect(status).toBe(400);
    expect(body).toEqual({
      error: "Valid hex color is required (e.g., #FF5733)",
    });
  });

  it("accepts lowercase hex colors", async () => {
    prismaMock.user.upsert.mockResolvedValue({});
    prismaMock.category.create.mockResolvedValue({ id: "c1", label: "Food" });
    const { status } = await readJson(
      await POST(jsonRequest({ label: "Food", icon: "x", color: "#ff5733" }))
    );
    expect(status).toBe(201);
  });

  it("upserts the User before creating the category, and trims the label", async () => {
    prismaMock.user.upsert.mockResolvedValue({});
    const created = { id: "c1", label: "Food", icon: "x", color: "#FF5733" };
    prismaMock.category.create.mockResolvedValue(created);

    const { status, body } = await readJson(
      await POST(
        jsonRequest({ label: "  Food  ", icon: "x", color: "#FF5733" })
      )
    );

    expect(status).toBe(201);
    expect(body).toEqual(created);

    expect(prismaMock.user.upsert).toHaveBeenCalledWith({
      where: { id: FAKE_USER.id },
      update: { email: FAKE_USER.email },
      create: { id: FAKE_USER.id, email: FAKE_USER.email },
    });

    // upsert must precede create
    const upsertOrder = prismaMock.user.upsert.mock.invocationCallOrder[0];
    const createOrder = prismaMock.category.create.mock.invocationCallOrder[0];
    expect(upsertOrder).toBeLessThan(createOrder);

    expect(prismaMock.category.create).toHaveBeenCalledWith({
      data: { label: "Food", icon: "x", color: "#FF5733", userId: FAKE_USER.id },
    });
  });

  // A duplicate [userId, label] violates @@unique and raises a Prisma P2002;
  // the route translates that into a friendly 409 rather than a generic 500.
  it("translates a duplicate-label P2002 into a 409", async () => {
    prismaMock.user.upsert.mockResolvedValue({});
    const p2002 = new PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "6",
    });
    prismaMock.category.create.mockRejectedValue(p2002);

    const { status, body } = await readJson(
      await POST(jsonRequest({ label: "Food", icon: "x", color: "#FF5733" }))
    );

    expect(status).toBe(409);
    expect(body).toEqual({ error: "A category with this name already exists" });
  });
});
