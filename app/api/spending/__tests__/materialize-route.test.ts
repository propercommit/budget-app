import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  FAKE_USER,
  jsonRequest,
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
    prismaMock: { budgetSeries: model(), spendingItem: model() },
    getAuthenticatedUser: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUser }));

import { POST } from "@/app/api/spending/materialize/route";

const FAKE_CATEGORY = { id: "cat-1", label: "Housing", icon: "home", color: "#007AFF" };

const series = (id: string, latestItem: { budgeted: number; month: string } | null) => ({
  id,
  name: `Series ${id}`,
  icon: "home",
  recurring: true,
  userId: FAKE_USER.id,
  categoryId: FAKE_CATEGORY.id,
  items: latestItem === null ? [] : [latestItem],
});

const dbItem = (id: string, seriesId: string) => ({
  id,
  seriesId,
  month: "2026-07",
  budgeted: 0,
  spent: 0,
  note: null,
  series: { ...series(seriesId, null), items: undefined, category: FAKE_CATEGORY },
  spendingEntries: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  getAuthenticatedUser.mockResolvedValue(FAKE_USER);
  prismaMock.budgetSeries.findMany.mockResolvedValue([]);
  prismaMock.spendingItem.findMany.mockResolvedValue([]);
});

describe("POST /api/spending/materialize", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const { status } = await readJson(await POST(jsonRequest({ month: "2026-07" })));
    expect(status).toBe(401);
  });

  it("400 when month is missing or malformed", async () => {
    const missing = await readJson(await POST(jsonRequest({})));
    expect(missing.status).toBe(400);

    const unpadded = await readJson(await POST(jsonRequest({ month: "2026-7" })));
    expect(unpadded.status).toBe(400);

    expect(prismaMock.budgetSeries.findMany).not.toHaveBeenCalled();
  });

  it("targets only recurring series without an incarnation this month (D22)", async () => {
    await POST(jsonRequest({ month: "2026-07" }));

    expect(prismaMock.budgetSeries.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: FAKE_USER.id,
          recurring: true,
          items: { none: { month: "2026-07" } },
        },
      })
    );
  });

  it("upserts one incarnation per missing series, inheriting the latest budget (D23)", async () => {
    prismaMock.budgetSeries.findMany.mockResolvedValue([
      series("ser-a", { budgeted: 60_000, month: "2026-06" }),
      series("ser-b", null), // series with no incarnations left
    ]);
    prismaMock.spendingItem.upsert.mockResolvedValue({});

    const { status } = await readJson(await POST(jsonRequest({ month: "2026-07" })));

    expect(status).toBe(200);
    expect(prismaMock.spendingItem.upsert).toHaveBeenCalledTimes(2);
    expect(prismaMock.spendingItem.upsert).toHaveBeenCalledWith({
      where: { seriesId_month: { seriesId: "ser-a", month: "2026-07" } },
      update: {}, // idempotent: an existing incarnation is left untouched
      create: { seriesId: "ser-a", month: "2026-07", budgeted: 60_000 },
    });
    expect(prismaMock.spendingItem.upsert).toHaveBeenCalledWith({
      where: { seriesId_month: { seriesId: "ser-b", month: "2026-07" } },
      update: {},
      create: { seriesId: "ser-b", month: "2026-07", budgeted: 0 },
    });
  });

  it("creates nothing when every recurring series is already incarnated", async () => {
    prismaMock.budgetSeries.findMany.mockResolvedValue([]);

    await POST(jsonRequest({ month: "2026-07" }));

    expect(prismaMock.spendingItem.upsert).not.toHaveBeenCalled();
  });

  it("returns the month's full flattened bucket, pre-existing items included", async () => {
    prismaMock.spendingItem.findMany.mockResolvedValue([
      dbItem("s-existing", "ser-x"),
      dbItem("s-new", "ser-y"),
    ]);

    const { status, body } = await readJson(await POST(jsonRequest({ month: "2026-07" })));

    expect(status).toBe(200);
    expect(prismaMock.spendingItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { series: { userId: FAKE_USER.id }, month: "2026-07" },
      })
    );

    const items = body as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.id)).toEqual(["s-existing", "s-new"]);
    expect(items[0].name).toBe("Series ser-x");
    expect(items[0].category).toEqual(FAKE_CATEGORY);
    expect(items[0].entries).toEqual([]);
    expect(items[0].series).toBeUndefined();
  });
});
