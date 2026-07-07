import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FAKE_USER, readJson } from "../../__tests__/helpers";

const {
  prismaMock,
  getAuthenticatedUser,
  revokeUserSessions,
  deleteUserMock,
  storageListMock,
  storageRemoveMock,
} = vi.hoisted(() => {
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
    revokeUserSessions: vi.fn(),
    deleteUserMock: vi.fn(),
    storageListMock: vi.fn(),
    storageRemoveMock: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUser, revokeUserSessions }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { admin: { deleteUser: deleteUserMock } },
    storage: {
      from: () => ({ list: storageListMock, remove: storageRemoveMock }),
    },
  }),
}));

import { DELETE } from "@/app/api/account/delete/route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
  getAuthenticatedUser.mockResolvedValue(FAKE_USER);
  revokeUserSessions.mockResolvedValue(undefined);
  prismaMock.user.deleteMany.mockResolvedValue({ count: 1 });
  deleteUserMock.mockResolvedValue({ error: null });
  storageListMock.mockResolvedValue({ data: [], error: null });
  storageRemoveMock.mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("DELETE /api/account/delete", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const { status } = await readJson(await DELETE());
    expect(status).toBe(401);
    expect(prismaMock.user.deleteMany).not.toHaveBeenCalled();
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("500 before deleting anything when no service-role key is configured", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
    vi.stubEnv("SUPABASE_SERVICE_ROLE", undefined);
    const { status, body } = await readJson(await DELETE());
    expect(status).toBe(500);
    expect(body).toEqual({ error: "Failed to delete account" });
    expect(prismaMock.user.deleteMany).not.toHaveBeenCalled();
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("accepts the legacy SUPABASE_SERVICE_ROLE variable as a fallback", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
    vi.stubEnv("SUPABASE_SERVICE_ROLE", "legacy-key");
    const { status } = await readJson(await DELETE());
    expect(status).toBe(200);
  });

  it("deletes the User row (cascading all data), the auth user, then revokes sessions", async () => {
    const { status, body } = await readJson(await DELETE());
    expect(status).toBe(200);
    expect(body).toEqual({ success: true });

    expect(prismaMock.user.deleteMany).toHaveBeenCalledWith({
      where: { id: FAKE_USER.id },
    });
    expect(deleteUserMock).toHaveBeenCalledWith(FAKE_USER.id);
    expect(revokeUserSessions).toHaveBeenCalledWith(FAKE_USER.id);

    // Ordering: DB wipe → auth-user delete → session revocation.
    const order = (fn: { mock: { invocationCallOrder: number[] } }) =>
      fn.mock.invocationCallOrder[0];
    expect(order(prismaMock.user.deleteMany)).toBeLessThan(order(deleteUserMock));
    expect(order(deleteUserMock)).toBeLessThan(order(revokeUserSessions));
  });

  it("removes the user's uploaded avatar files", async () => {
    storageListMock.mockResolvedValue({
      data: [{ name: `${FAKE_USER.id}-123.jpg` }, { name: `${FAKE_USER.id}-456.png` }],
      error: null,
    });
    const { status } = await readJson(await DELETE());
    expect(status).toBe(200);
    expect(storageListMock).toHaveBeenCalledWith("avatars", {
      search: `${FAKE_USER.id}-`,
    });
    expect(storageRemoveMock).toHaveBeenCalledWith([
      `avatars/${FAKE_USER.id}-123.jpg`,
      `avatars/${FAKE_USER.id}-456.png`,
    ]);
  });

  it("still succeeds when avatar cleanup fails (best-effort)", async () => {
    storageListMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    const { status, body } = await readJson(await DELETE());
    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(storageRemoveMock).not.toHaveBeenCalled();
    expect(deleteUserMock).toHaveBeenCalledWith(FAKE_USER.id);
  });

  it("500 when Supabase auth deletion fails — success would leave a working login", async () => {
    deleteUserMock.mockResolvedValue({ error: { message: "boom", status: 500 } });
    const { status, body } = await readJson(await DELETE());
    expect(status).toBe(500);
    expect(body).toEqual({ error: "Failed to delete account" });
    expect(revokeUserSessions).not.toHaveBeenCalled();
  });

  it("treats an already-deleted auth user (404) as success, so retries converge", async () => {
    deleteUserMock.mockResolvedValue({ error: { message: "User not found", status: 404 } });
    const { status, body } = await readJson(await DELETE());
    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(revokeUserSessions).toHaveBeenCalledWith(FAKE_USER.id);
  });

  it("still succeeds when session revocation fails (best-effort)", async () => {
    revokeUserSessions.mockRejectedValue(new Error("redis down"));
    const { status, body } = await readJson(await DELETE());
    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
  });

  it("returns 500 when the Prisma deletion throws and never touches the auth user", async () => {
    prismaMock.user.deleteMany.mockRejectedValue(new Error("db down"));
    const { status, body } = await readJson(await DELETE());
    expect(status).toBe(500);
    expect(body).toEqual({ error: "Failed to delete account" });
    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(revokeUserSessions).not.toHaveBeenCalled();
  });
});
