import { describe, it, expect, beforeEach, vi } from "vitest";
import { monthOfDate } from "@/lib/spending/month";
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
    createMany: vi.fn(),
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

/** Shifts a zero-padded "YYYY-MM" month by `delta` calendar months. */
const shiftMonth = (month: string, delta: number): string => {

  const [year, monthNumber] = month.split("-").map(Number);

  return monthOfDate(new Date(Date.UTC(year, monthNumber - 1 + delta, 1)));
};

// The D26 guard compares against the real current UTC month, so fixtures are
// derived from "now" (same precedent as the entries route tests) instead of
// hardcoded strings that would silently become past months.
const CURRENT_MONTH = monthOfDate(new Date());
const PREVIOUS_MONTH = shiftMonth(CURRENT_MONTH, -1);
const PAST_MONTH = shiftMonth(CURRENT_MONTH, -2);
const FUTURE_MONTH = shiftMonth(CURRENT_MONTH, 2);

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

const dbItem = (id: string, seriesId: string, month = CURRENT_MONTH) => ({
  id,
  seriesId,
  month,
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
    const { status } = await readJson(await POST(jsonRequest({ month: CURRENT_MONTH })));
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
    await POST(jsonRequest({ month: CURRENT_MONTH }));

    expect(prismaMock.budgetSeries.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: FAKE_USER.id,
          recurring: true,
          items: { none: { month: CURRENT_MONTH } },
        },
      })
    );
  });

  it("creates one incarnation per missing series, inheriting the latest budget (D23)", async () => {
    prismaMock.budgetSeries.findMany.mockResolvedValue([
      series("ser-a", { budgeted: 60_000, month: PREVIOUS_MONTH }),
      series("ser-b", null), // series with no incarnations left
    ]);
    prismaMock.spendingItem.createMany.mockResolvedValue({ count: 2 });

    const { status } = await readJson(await POST(jsonRequest({ month: CURRENT_MONTH })));

    expect(status).toBe(200);
    expect(prismaMock.spendingItem.createMany).toHaveBeenCalledWith({
      data: [
        { seriesId: "ser-a", month: CURRENT_MONTH, budgeted: 60_000 },
        { seriesId: "ser-b", month: CURRENT_MONTH, budgeted: 0 },
      ],
      // Idempotence backstop for a concurrent double call on (seriesId, month).
      skipDuplicates: true,
    });
  });

  it("creates nothing when every recurring series is already incarnated", async () => {
    prismaMock.budgetSeries.findMany.mockResolvedValue([]);

    await POST(jsonRequest({ month: CURRENT_MONTH }));

    expect(prismaMock.spendingItem.createMany).not.toHaveBeenCalled();
  });

  it("returns the month's full flattened bucket, pre-existing items included", async () => {
    prismaMock.spendingItem.findMany.mockResolvedValue([
      dbItem("s-existing", "ser-x"),
      dbItem("s-new", "ser-y"),
    ]);

    const { status, body } = await readJson(await POST(jsonRequest({ month: CURRENT_MONTH })));

    expect(status).toBe(200);
    expect(prismaMock.spendingItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { series: { userId: FAKE_USER.id }, month: CURRENT_MONTH },
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

  describe("now-and-forward bound (D26)", () => {
    it("past month: creates nothing, never queries candidates, still returns the existing bucket", async () => {
      prismaMock.spendingItem.findMany.mockResolvedValue([dbItem("s-old", "ser-x", PAST_MONTH)]);

      const { status, body } = await readJson(await POST(jsonRequest({ month: PAST_MONTH })));

      expect(status).toBe(200);
      expect(prismaMock.budgetSeries.findMany).not.toHaveBeenCalled();
      expect(prismaMock.spendingItem.createMany).not.toHaveBeenCalled();

      // The client replaces the month bucket wholesale with this response, so
      // a past month must still answer with its existing flattened items.
      const items = body as Array<Record<string, unknown>>;
      expect(items.map((i) => i.id)).toEqual(["s-old"]);
      expect(items[0].name).toBe("Series ser-x");
    });

    it("future month: still materializes (planning ahead stays legitimate)", async () => {
      prismaMock.budgetSeries.findMany.mockResolvedValue([
        series("ser-a", { budgeted: 4_200, month: CURRENT_MONTH }),
      ]);
      prismaMock.spendingItem.createMany.mockResolvedValue({ count: 1 });

      const { status } = await readJson(await POST(jsonRequest({ month: FUTURE_MONTH })));

      expect(status).toBe(200);
      expect(prismaMock.spendingItem.createMany).toHaveBeenCalledWith({
        data: [{ seriesId: "ser-a", month: FUTURE_MONTH, budgeted: 4_200 }],
        skipDuplicates: true,
      });
    });

    it("pause-gap regression: a resumed series is not backfilled into a past gap month", async () => {
      // Off during PAST_MONTH, resumed since: recurring is true again and the
      // latest incarnation is current — exactly the shape that pre-D26 was
      // backfilled into the gap the moment the user navigated back to it.
      prismaMock.budgetSeries.findMany.mockResolvedValue([
        series("ser-resumed", { budgeted: 1_500, month: CURRENT_MONTH }),
      ]);

      const { status, body } = await readJson(await POST(jsonRequest({ month: PAST_MONTH })));

      expect(status).toBe(200);
      expect(prismaMock.spendingItem.createMany).not.toHaveBeenCalled();
      expect(body).toEqual([]);
    });
  });
});
