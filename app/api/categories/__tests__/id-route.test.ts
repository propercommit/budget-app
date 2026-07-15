import { describe, it, expect, beforeEach, vi } from "vitest";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import {
  FAKE_USER,
  jsonRequest,
  getRequest,
  routeContext,
  readJson,
} from "../../__tests__/helpers";

const { prismaMock, getAuthenticatedUser, removeReceiptObjects } = vi.hoisted(() => {
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
    prismaMock: { category: model(), spendingItem: model(), spendingEntry: model() },
    getAuthenticatedUser: vi.fn(),
    removeReceiptObjects: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUser }));
vi.mock("@/lib/receipt-cleanup", () => ({ removeReceiptObjects }));

import { PUT, DELETE } from "@/app/api/categories/[id]/route";

beforeEach(() => {
  vi.clearAllMocks();
  getAuthenticatedUser.mockResolvedValue(FAKE_USER);
});

describe("PUT /api/categories/[id]", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const res = await PUT(jsonRequest({ label: "X" }), routeContext("c1"));
    expect((await readJson(res)).status).toBe(401);
  });

  it("400 when no fields provided", async () => {
    const { status, body } = await readJson(
      await PUT(jsonRequest({}), routeContext("c1"))
    );
    expect(status).toBe(400);
    expect(body).toEqual({
      error: "At least one field (label, icon, or color) is required",
    });
  });

  it("400 when label is blank", async () => {
    const { status, body } = await readJson(
      await PUT(jsonRequest({ label: "   " }), routeContext("c1"))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "Label must be a non-empty string" });
  });

  it("400 when label exceeds 30 chars", async () => {
    const { status, body } = await readJson(
      await PUT(jsonRequest({ label: "a".repeat(31) }), routeContext("c1"))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "Label must be 30 characters or less" });
  });

  it("accepts a label of exactly 30 chars (boundary)", async () => {
    prismaMock.category.findFirst.mockResolvedValue({ id: "c1" });
    prismaMock.category.update.mockResolvedValue({ id: "c1" });
    const { status } = await readJson(
      await PUT(jsonRequest({ label: "a".repeat(30) }), routeContext("c1"))
    );
    expect(status).toBe(200);
  });

  it("400 when color is not a valid hex", async () => {
    const { status, body } = await readJson(
      await PUT(jsonRequest({ color: "red" }), routeContext("c1"))
    );
    expect(status).toBe(400);
    expect(body).toEqual({
      error: "Color must be a valid hex color (e.g., #FF5733)",
    });
  });

  it("treats an empty-string icon as 'no fields' (the no-fields guard fires first)", async () => {
    // `if (!label && !icon && !color)` — an empty icon is falsy, so when it is
    // the only key the handler reports the no-fields error, never reaching the
    // icon type-check below it.
    const { status, body } = await readJson(
      await PUT(jsonRequest({ icon: "" }), routeContext("c1"))
    );
    expect(status).toBe(400);
    expect(body).toEqual({
      error: "At least one field (label, icon, or color) is required",
    });
  });

  it("400 when icon is a non-string (reaches the icon type-check via a 2nd field)", async () => {
    // A truthy label gets past the no-fields guard; the numeric icon then trips
    // the icon validator.
    const { status, body } = await readJson(
      await PUT(jsonRequest({ label: "Food", icon: 123 }), routeContext("c1"))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "Icon must be a non-empty string" });
  });

  it("404 when the category does not belong to the user", async () => {
    prismaMock.category.findFirst.mockResolvedValue(null);
    const { status, body } = await readJson(
      await PUT(jsonRequest({ label: "X" }), routeContext("c1"))
    );
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Category not found" });
    expect(prismaMock.category.findFirst).toHaveBeenCalledWith({
      where: { id: "c1", userId: FAKE_USER.id },
    });
    expect(prismaMock.category.update).not.toHaveBeenCalled();
  });

  it("updates only the provided fields and trims the label", async () => {
    prismaMock.category.findFirst.mockResolvedValue({ id: "c1" });
    const updated = { id: "c1", label: "Groceries" };
    prismaMock.category.update.mockResolvedValue(updated);

    const { status, body } = await readJson(
      await PUT(jsonRequest({ label: "  Groceries  " }), routeContext("c1"))
    );

    expect(status).toBe(200);
    expect(body).toEqual(updated);
    expect(prismaMock.category.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { label: "Groceries" },
    });
  });

  // Renaming onto a label the user already has violates @@unique([userId,
  // label]); the route translates the Prisma P2002 into a friendly 409,
  // mirroring the POST handler.
  it("translates a duplicate-label P2002 into a 409", async () => {
    prismaMock.category.findFirst.mockResolvedValue({ id: "c1" });
    const p2002 = new PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "6",
    });
    prismaMock.category.update.mockRejectedValue(p2002);

    const { status, body } = await readJson(
      await PUT(jsonRequest({ label: "Groceries" }), routeContext("c1"))
    );

    expect(status).toBe(409);
    expect(body).toEqual({ error: "A category with this name already exists" });
  });
});

describe("DELETE /api/categories/[id]", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const res = await DELETE(getRequest("http://localhost"), routeContext("c1"));
    expect((await readJson(res)).status).toBe(401);
  });

  it("404 when category not found", async () => {
    prismaMock.category.findFirst.mockResolvedValue(null);
    const { status, body } = await readJson(
      await DELETE(getRequest("http://localhost"), routeContext("c1"))
    );
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Category not found" });
    expect(prismaMock.category.delete).not.toHaveBeenCalled();
  });

  it("deletes the category and returns success", async () => {
    prismaMock.category.findFirst.mockResolvedValue({ id: "c1" });
    prismaMock.spendingEntry.findMany.mockResolvedValue([]);
    prismaMock.category.delete.mockResolvedValue({ id: "c1" });
    const { status, body } = await readJson(
      await DELETE(getRequest("http://localhost"), routeContext("c1"))
    );
    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(prismaMock.category.delete).toHaveBeenCalledWith({
      where: { id: "c1" },
    });
    // No receipts in the blast radius — the cleanup still runs, with nothing to remove.
    expect(removeReceiptObjects).toHaveBeenCalledWith([]);
  });

  // The category delete is the hidden mass-delete: the DB cascade (category →
  // series → items → entries) destroys every entry across ALL months without
  // application code seeing them — the route must enumerate receipt paths via
  // the series traversal BEFORE the delete and clean them up AFTER it.
  it("enumerates receipt paths across the cascade and removes them after the delete", async () => {
    prismaMock.category.findFirst.mockResolvedValue({ id: "c1" });
    prismaMock.spendingEntry.findMany.mockResolvedValue([
      { receiptPath: "user-123/e1" },
      { receiptPath: "user-123/e2" },
      { receiptPath: "user-123/e3" },
    ]);
    prismaMock.category.delete.mockResolvedValue({ id: "c1" });

    const { status } = await readJson(
      await DELETE(getRequest("http://localhost"), routeContext("c1"))
    );

    expect(status).toBe(200);
    expect(prismaMock.spendingEntry.findMany).toHaveBeenCalledWith({
      where: { spendingItem: { series: { categoryId: "c1" } }, receiptPath: { not: null } },
      select: { receiptPath: true },
    });
    expect(removeReceiptObjects).toHaveBeenCalledTimes(1);
    expect(removeReceiptObjects).toHaveBeenCalledWith([
      "user-123/e1",
      "user-123/e2",
      "user-123/e3",
    ]);

    // DB first, storage second — the reverse would let a failed delete leave
    // live entries pointing at dead objects.
    const deleteOrder = prismaMock.category.delete.mock.invocationCallOrder[0];
    const removeOrder = removeReceiptObjects.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(removeOrder);
  });

  it("does not touch storage when the category is missing or foreign", async () => {
    prismaMock.category.findFirst.mockResolvedValue(null);

    await DELETE(getRequest("http://localhost"), routeContext("c1"));

    expect(removeReceiptObjects).not.toHaveBeenCalled();
  });
});
