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
    prismaMock: { budgetSeries: model() },
    getAuthenticatedUser: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUser }));

import { GET } from "@/app/api/spending/series/route";

beforeEach(() => {
  vi.clearAllMocks();
  getAuthenticatedUser.mockResolvedValue(FAKE_USER);
});

describe("GET /api/spending/series", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const { status } = await readJson(await GET());
    expect(status).toBe(401);
  });

  it("summarizes each series with its activity window and last budget", async () => {
    prismaMock.budgetSeries.findMany.mockResolvedValue([
      {
        id: "ser-1",
        name: "Netflix",
        icon: "film",
        recurring: false,
        categoryId: "cat-fun",
        category: { label: "Entertainment", color: "#AF52DE" },
        // month desc: first row is the latest incarnation.
        items: [
          { month: "2025-05", budgeted: 1890 },
          { month: "2025-01", budgeted: 1590 },
        ],
      },
      {
        id: "ser-2",
        name: "Never incarnated",
        icon: "tag",
        recurring: true,
        categoryId: "cat-misc",
        category: { label: "Misc", color: "#8E8E93" },
        items: [],
      },
    ]);

    const { status, body } = await readJson(await GET());

    expect(status).toBe(200);
    expect(body).toEqual([
      {
        id: "ser-1",
        name: "Netflix",
        icon: "film",
        categoryId: "cat-fun",
        categoryLabel: "Entertainment",
        categoryColor: "#AF52DE",
        recurring: false,
        firstActiveMonth: "2025-01",
        lastActiveMonth: "2025-05",
        lastBudgeted: 1890,
      },
      {
        id: "ser-2",
        name: "Never incarnated",
        icon: "tag",
        categoryId: "cat-misc",
        categoryLabel: "Misc",
        categoryColor: "#8E8E93",
        recurring: true,
        firstActiveMonth: null,
        lastActiveMonth: null,
        lastBudgeted: null,
      },
    ]);

    expect(prismaMock.budgetSeries.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: FAKE_USER.id } })
    );
  });
});
