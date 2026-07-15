import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FAKE_USER, readJson } from "../../__tests__/helpers";

const {
  prismaMock,
  getAuthenticatedUser,
  revokeUserSessions,
  deleteUserMock,
  avatarListMock,
  avatarRemoveMock,
  receiptListMock,
  receiptRemoveMock,
} = vi.hoisted(() => ({
  // The route only touches the User row — the DB cascades wipe everything else.
  prismaMock: { user: { deleteMany: vi.fn() } },
  getAuthenticatedUser: vi.fn(),
  revokeUserSessions: vi.fn(),
  deleteUserMock: vi.fn(),
  avatarListMock: vi.fn(),
  avatarRemoveMock: vi.fn(),
  receiptListMock: vi.fn(),
  receiptRemoveMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUser, revokeUserSessions }));
// The route sweeps two buckets ("avatars" and "receipts") with different
// list/remove call shapes, so the storage mock dispatches per bucket.
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { admin: { deleteUser: deleteUserMock } },
    storage: {
      from: (bucket: string) =>
        bucket === "receipts"
          ? { list: receiptListMock, remove: receiptRemoveMock }
          : { list: avatarListMock, remove: avatarRemoveMock },
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
  avatarListMock.mockResolvedValue({ data: [], error: null });
  avatarRemoveMock.mockResolvedValue({ error: null });
  receiptListMock.mockResolvedValue({ data: [], error: null });
  receiptRemoveMock.mockResolvedValue({ error: null });
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
    avatarListMock.mockResolvedValue({
      data: [{ name: `${FAKE_USER.id}-123.jpg` }, { name: `${FAKE_USER.id}-456.png` }],
      error: null,
    });
    const { status } = await readJson(await DELETE());
    expect(status).toBe(200);
    expect(avatarListMock).toHaveBeenCalledWith("avatars", {
      search: `${FAKE_USER.id}-`,
    });
    expect(avatarRemoveMock).toHaveBeenCalledWith([
      `avatars/${FAKE_USER.id}-123.jpg`,
      `avatars/${FAKE_USER.id}-456.png`,
    ]);
  });

  it("still succeeds when avatar cleanup fails (best-effort)", async () => {
    avatarListMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    const { status, body } = await readJson(await DELETE());
    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(avatarRemoveMock).not.toHaveBeenCalled();
    expect(deleteUserMock).toHaveBeenCalledWith(FAKE_USER.id);
  });

  it("sweeps the user's receipts folder: lists `<userId>/` in the receipts bucket and removes every object", async () => {
    receiptListMock.mockResolvedValueOnce({
      data: [{ name: "entry-1" }, { name: "entry-2" }],
      error: null,
    });
    const { status, body } = await readJson(await DELETE());
    expect(status).toBe(200);
    expect(body).toEqual({ success: true });

    expect(receiptListMock).toHaveBeenCalledWith(FAKE_USER.id, { limit: 100 });
    expect(receiptRemoveMock).toHaveBeenCalledTimes(1);
    expect(receiptRemoveMock).toHaveBeenCalledWith([
      `${FAKE_USER.id}/entry-1`,
      `${FAKE_USER.id}/entry-2`,
    ]);
  });

  it("paginates the receipts sweep: a full page of 100 triggers a re-list from the front", async () => {
    // Removal shifts the listing window, so the route re-lists page 1 after
    // each remove instead of advancing an offset — a full page (100) must be
    // followed by another list; the short page (2) ends the sweep.
    const fullPage = Array.from({ length: 100 }, (_, i) => ({ name: `entry-${i}` }));

    receiptListMock
      .mockResolvedValueOnce({ data: fullPage, error: null })
      .mockResolvedValueOnce({ data: [{ name: "entry-100" }, { name: "entry-101" }], error: null });

    const { status } = await readJson(await DELETE());
    expect(status).toBe(200);

    expect(receiptListMock).toHaveBeenCalledTimes(2);
    expect(receiptListMock).toHaveBeenNthCalledWith(1, FAKE_USER.id, { limit: 100 });
    expect(receiptListMock).toHaveBeenNthCalledWith(2, FAKE_USER.id, { limit: 100 });

    expect(receiptRemoveMock).toHaveBeenCalledTimes(2);
    expect(receiptRemoveMock).toHaveBeenNthCalledWith(
      1,
      fullPage.map((file) => `${FAKE_USER.id}/${file.name}`)
    );
    expect(receiptRemoveMock).toHaveBeenNthCalledWith(2, [
      `${FAKE_USER.id}/entry-100`,
      `${FAKE_USER.id}/entry-101`,
    ]);
  });

  it("still succeeds when the receipts sweep fails to list (best-effort)", async () => {
    receiptListMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    avatarListMock.mockResolvedValue({
      data: [{ name: `${FAKE_USER.id}-123.jpg` }],
      error: null,
    });

    const { status, body } = await readJson(await DELETE());
    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(receiptRemoveMock).not.toHaveBeenCalled();

    // The failure is contained to the receipts sweep: the avatar cleanup and
    // the auth-user delete still run.
    expect(avatarRemoveMock).toHaveBeenCalledWith([`avatars/${FAKE_USER.id}-123.jpg`]);
    expect(deleteUserMock).toHaveBeenCalledWith(FAKE_USER.id);
    expect(revokeUserSessions).toHaveBeenCalledWith(FAKE_USER.id);
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
