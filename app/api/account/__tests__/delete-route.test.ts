import { describe, it, expect, beforeEach, vi } from "vitest";
import { FAKE_USER, readJson } from "../../__tests__/helpers";

const { prismaMock, getAuthenticatedUser, deleteUserMock } = vi.hoisted(() => {
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
    },
    getAuthenticatedUser: vi.fn(),
    deleteUserMock: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUser }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { admin: { deleteUser: deleteUserMock } },
  }),
}));

import { DELETE } from "@/app/api/account/delete/route";

beforeEach(() => {
  vi.clearAllMocks();
  getAuthenticatedUser.mockResolvedValue(FAKE_USER);
  // All deletes resolve by default.
  prismaMock.spendingEntry.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.spendingItem.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.category.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.incomeSource.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.user.delete.mockResolvedValue({ id: FAKE_USER.id });
  deleteUserMock.mockResolvedValue({ error: null });
});

describe("DELETE /api/account/delete", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const { status } = await readJson(await DELETE());
    expect(status).toBe(401);
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });

  it("deletes children before the user, then the Supabase auth user", async () => {
    const { status, body } = await readJson(await DELETE());
    expect(status).toBe(200);
    expect(body).toEqual({ success: true });

    // Children scoped to the user.
    expect(prismaMock.spendingEntry.deleteMany).toHaveBeenCalledWith({
      where: { spendingItem: { userId: FAKE_USER.id } },
    });
    expect(prismaMock.incomeSource.deleteMany).toHaveBeenCalledWith({
      where: { userId: FAKE_USER.id },
    });
    expect(prismaMock.user.delete).toHaveBeenCalledWith({
      where: { id: FAKE_USER.id },
    });
    expect(deleteUserMock).toHaveBeenCalledWith(FAKE_USER.id);

    // Ordering: entries → items → user row → supabase.
    const order = (fn: { mock: { invocationCallOrder: number[] } }) =>
      fn.mock.invocationCallOrder[0];
    expect(order(prismaMock.spendingEntry.deleteMany)).toBeLessThan(
      order(prismaMock.spendingItem.deleteMany)
    );
    expect(order(prismaMock.spendingItem.deleteMany)).toBeLessThan(
      order(prismaMock.user.delete)
    );
    expect(order(prismaMock.user.delete)).toBeLessThan(order(deleteUserMock));
  });

  it("still returns 200 when Supabase auth deletion reports an error (Prisma already cleaned up)", async () => {
    deleteUserMock.mockResolvedValue({ error: { message: "boom" } });
    const { status, body } = await readJson(await DELETE());
    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
  });

  it("returns 500 when a Prisma deletion throws", async () => {
    prismaMock.user.delete.mockRejectedValue(new Error("fk violation"));
    const { status, body } = await readJson(await DELETE());
    expect(status).toBe(500);
    expect(body).toEqual({ error: "Failed to delete account" });
  });
});
