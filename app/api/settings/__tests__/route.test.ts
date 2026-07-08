import { describe, it, expect, beforeEach, vi } from "vitest";
import { FAKE_USER, jsonRequest, readJson } from "../../__tests__/helpers";

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
    prismaMock: { userSettings: model(), user: model() },
    getAuthenticatedUser: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUser }));

import { GET, PUT } from "@/app/api/settings/route";

beforeEach(() => {
  vi.clearAllMocks();
  getAuthenticatedUser.mockResolvedValue(FAKE_USER);
});

describe("GET /api/settings", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    expect((await readJson(await GET())).status).toBe(401);
  });

  it("returns existing settings without creating", async () => {
    prismaMock.userSettings.findUnique.mockResolvedValue({
      userId: FAKE_USER.id,
      currency: "EUR",
    });
    const { status, body } = await readJson(await GET());
    expect(status).toBe(200);
    expect(body).toEqual({ userId: FAKE_USER.id, currency: "EUR" });
    expect(prismaMock.userSettings.create).not.toHaveBeenCalled();
  });

  it("creates defaults (USD / MM/DD/YYYY / light) when none exist", async () => {
    prismaMock.userSettings.findUnique.mockResolvedValue(null);
    const created = {
      userId: FAKE_USER.id,
      currency: "USD",
      dateFormat: "MM/DD/YYYY",
      darkMode: false,
    };
    prismaMock.userSettings.create.mockResolvedValue(created);

    const { status, body } = await readJson(await GET());
    expect(status).toBe(200);
    expect(body).toEqual(created);
    expect(prismaMock.userSettings.create).toHaveBeenCalledWith({
      data: {
        userId: FAKE_USER.id,
        currency: "USD",
        dateFormat: "MM/DD/YYYY",
        darkMode: false,
      },
    });
  });

  // The lazy-create branch is the first write for a user whose settings row is
  // missing — self-heal the User row before it, or the FK create fails.
  it("upserts the User before creating default settings", async () => {
    prismaMock.userSettings.findUnique.mockResolvedValue(null);
    prismaMock.user.upsert.mockResolvedValue({});
    prismaMock.userSettings.create.mockResolvedValue({ userId: FAKE_USER.id });

    await GET();

    expect(prismaMock.user.upsert).toHaveBeenCalledWith({
      where: { id: FAKE_USER.id },
      update: { email: FAKE_USER.email },
      create: { id: FAKE_USER.id, email: FAKE_USER.email },
    });

    const upsertOrder = prismaMock.user.upsert.mock.invocationCallOrder[0];
    const createOrder = prismaMock.userSettings.create.mock.invocationCallOrder[0];
    expect(upsertOrder).toBeLessThan(createOrder);
  });
});

describe("PUT /api/settings", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const { status } = await readJson(await PUT(jsonRequest({ currency: "EUR" })));
    expect(status).toBe(401);
  });

  it("400 when no fields provided", async () => {
    const { status, body } = await readJson(await PUT(jsonRequest({})));
    expect(status).toBe(400);
    expect(body).toEqual({ error: "At least one field is required to update" });
  });

  it("400 on an invalid currency", async () => {
    const { status, body } = await readJson(
      await PUT(jsonRequest({ currency: "XYZ" }))
    );
    expect(status).toBe(400);
    expect(body).toMatchObject({ error: expect.stringContaining("Invalid currency") });
  });

  it("400 on an invalid date format", async () => {
    const { status, body } = await readJson(
      await PUT(jsonRequest({ dateFormat: "DD.MM.YY" }))
    );
    expect(status).toBe(400);
    expect(body).toMatchObject({
      error: expect.stringContaining("Invalid date format"),
    });
  });

  it("400 when darkMode is not a boolean", async () => {
    const { status, body } = await readJson(
      await PUT(jsonRequest({ darkMode: "true" }))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "darkMode must be a boolean" });
  });

  it("upserts only the provided fields and fills defaults on create", async () => {
    const updated = { userId: FAKE_USER.id, currency: "EUR" };
    prismaMock.userSettings.upsert.mockResolvedValue(updated);

    const { status, body } = await readJson(
      await PUT(jsonRequest({ currency: "EUR" }))
    );
    expect(status).toBe(200);
    expect(body).toEqual(updated);

    expect(prismaMock.userSettings.upsert).toHaveBeenCalledWith({
      where: { userId: FAKE_USER.id },
      update: { currency: "EUR" },
      create: {
        userId: FAKE_USER.id,
        currency: "EUR",
        dateFormat: "MM/DD/YYYY",
        darkMode: false,
      },
    });
  });

  // The upsert can take its create branch, so the User row must exist first.
  it("upserts the User before upserting settings", async () => {
    prismaMock.user.upsert.mockResolvedValue({});
    prismaMock.userSettings.upsert.mockResolvedValue({ userId: FAKE_USER.id });

    await PUT(jsonRequest({ currency: "EUR" }));

    expect(prismaMock.user.upsert).toHaveBeenCalledWith({
      where: { id: FAKE_USER.id },
      update: { email: FAKE_USER.email },
      create: { id: FAKE_USER.id, email: FAKE_USER.email },
    });

    const userOrder = prismaMock.user.upsert.mock.invocationCallOrder[0];
    const settingsOrder = prismaMock.userSettings.upsert.mock.invocationCallOrder[0];
    expect(userOrder).toBeLessThan(settingsOrder);
  });

  it("accepts darkMode: false (a falsy-but-valid value)", async () => {
    prismaMock.userSettings.upsert.mockResolvedValue({ darkMode: false });
    const { status } = await readJson(await PUT(jsonRequest({ darkMode: false })));
    expect(status).toBe(200);
    const arg = prismaMock.userSettings.upsert.mock.calls[0][0];
    expect(arg.update).toEqual({ darkMode: false });
  });
});
