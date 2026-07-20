import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { FAKE_USER, jsonRequest, readJson } from "../../__tests__/helpers";
import { DEFAULT_INCOME_ICON } from "@/lib/constants";
import type { Fate } from "@/lib/categorize/learn";

const { prismaMock, txMock, getAuthenticatedUser } = vi.hoisted(() => {
  const model = () => ({
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
  });

  // Two separate clients: the route must do ALL import writes through the
  // transaction client (txMock) — any write on the outer client would escape
  // the rollback and break atomicity.
  const txMock = {
    import: model(),
    categorizationRule: model(),
    budgetSeries: model(),
    spendingItem: model(),
    spendingEntry: model(),
    incomeSource: model(),
  };

  return {
    prismaMock: {
      import: model(),
      categorizationRule: model(),
      budgetSeries: model(),
      spendingItem: model(),
      spendingEntry: model(),
      incomeSource: model(),
      category: model(),
      user: model(),
      $transaction: vi.fn(),
    },
    txMock,
    getAuthenticatedUser: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUser }));

import { POST } from "@/app/api/import/commit/route";

// --- helpers --------------------------------------------------------------

const FAKE_CATEGORY = {
  id: "cat-groceries",
  label: "Groceries",
  icon: "shopping-cart",
  color: "#34C759",
  userId: FAKE_USER.id,
};

const btx = (over: Record<string, unknown> = {}) => ({
  date: "2026-06-02",
  amount: 5430,
  direction: "debit",
  description: "MIGROS SUPERMARKT ZUERICH",
  externalId: "BANKREF001",
  currency: "CHF",
  ...over,
});

const routeSpending = (categoryId: string, learnKey?: string): Fate =>
  learnKey === undefined
    ? { kind: "route", value: { type: "spending", categoryId } }
    : { kind: "route", value: { type: "spending", categoryId }, learnKey };

const routeIncome: Fate = { kind: "route", value: { type: "income" } };

const routeExclude: Fate = { kind: "route", value: { type: "exclude" } };

const commit = (transactions: unknown[], extra: Record<string, unknown> = {}) =>
  POST(jsonRequest({ transactions, ...extra }));

const ruleRow = (
  match: string,
  valueType: "income" | "spending" | "exclude",
  over: Record<string, unknown> = {},
) => ({
  id: `rule-${match}-${valueType}`,
  userId: FAKE_USER.id,
  match,
  valueType,
  categoryId: valueType === "spending" ? FAKE_CATEGORY.id : null,
  seriesId: null,
  useCount: 1,
  ...over,
});

const WRITE_FNS = ["create", "createMany", "update", "updateMany", "upsert", "delete", "deleteMany"] as const;

beforeEach(() => {
  vi.clearAllMocks();
  getAuthenticatedUser.mockResolvedValue(FAKE_USER);
  prismaMock.user.upsert.mockResolvedValue({});
  prismaMock.category.findMany.mockResolvedValue([FAKE_CATEGORY]);
  // Callback transactions run against the dedicated tx client.
  prismaMock.$transaction.mockImplementation(
    async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock),
  );

  txMock.import.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
    id: "import-1",
    ...args.data,
  }));
  txMock.categorizationRule.findMany.mockResolvedValue([]);
  txMock.categorizationRule.create.mockResolvedValue({});
  txMock.categorizationRule.updateMany.mockResolvedValue({ count: 1 });
  txMock.budgetSeries.findFirst.mockResolvedValue(null);
  txMock.budgetSeries.create.mockImplementation(async (args: { data: { name: string } }) => ({
    id: `series-${args.data.name}`,
    ...args.data,
  }));
  txMock.spendingItem.upsert.mockImplementation(
    async (args: { where: { seriesId_month: { seriesId: string; month: string } } }) => ({
      id: `item-${args.where.seriesId_month.seriesId}|${args.where.seriesId_month.month}`,
      seriesId: args.where.seriesId_month.seriesId,
      month: args.where.seriesId_month.month,
      budgeted: 0,
      spent: 0,
    }),
  );
  txMock.spendingEntry.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
    id: "entry-1",
    ...args.data,
  }));
  txMock.spendingEntry.findMany.mockResolvedValue([]);
  txMock.spendingItem.update.mockResolvedValue({});
  txMock.incomeSource.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
    id: "income-1",
    ...args.data,
  }));
});

// --- auth & validation ----------------------------------------------------

describe("POST /api/import/commit — auth & validation", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);

    const { status, body } = await readJson(await commit([{ tx: btx(), fate: routeIncome }]));

    expect(status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it.each([
    { payload: {}, label: "missing" },
    { payload: { transactions: [] }, label: "empty" },
    { payload: { transactions: "nope" }, label: "not an array" },
  ])("400 when transactions is invalid ($label)", async ({ payload }) => {
    const { status, body } = await readJson(await POST(jsonRequest(payload)));

    expect(status).toBe(400);
    expect(body).toEqual({ error: "Transactions must be a non-empty array" });
  });

  it.each([
    { over: { date: "2026-6-02" }, error: "Transaction dates must be zero-padded YYYY-MM-DD" },
    { over: { date: "2026-02-31" }, error: "Transaction dates must be zero-padded YYYY-MM-DD" },
    { over: { amount: 10.5 }, error: "Transaction amounts must be positive integer cents" },
    { over: { amount: 0 }, error: "Transaction amounts must be positive integer cents" },
    { over: { amount: 10_000_000_001 }, error: "Transaction amounts must be positive integer cents" },
    { over: { direction: "transfer" }, error: 'Transaction direction must be "debit" or "credit"' },
    { over: { description: 42 }, error: "Transaction description must be a string" },
  ])("400 on invalid transaction field ($error)", async ({ over, error }) => {
    const { status, body } = await readJson(
      await commit([{ tx: btx(over), fate: routeSpending(FAKE_CATEGORY.id) }]),
    );

    expect(status).toBe(400);
    expect(body).toEqual({ error });
  });

  it.each([
    { fate: undefined, error: "Each transaction must carry a valid fate" },
    { fate: { kind: "yolo" }, error: "Each transaction must carry a valid fate" },
    { fate: { kind: "route" }, error: "Route fates must carry a valid destination" },
    { fate: { kind: "route", value: { type: "magic" } }, error: "Route fates must carry a valid destination" },
    { fate: { kind: "route", value: { type: "spending" } }, error: "Spending routes must carry a categoryId" },
    { fate: { kind: "alwaysExclude", learnKey: "   " }, error: "Always-exclude fates must carry a non-empty learnKey" },
  ])("400 on invalid fate ($error)", async ({ fate, error }) => {
    const { status, body } = await readJson(await commit([{ tx: btx(), fate }]));

    expect(status).toBe(400);
    expect(body).toEqual({ error });
  });

  it("400 when a debit is routed to income — direction/income consistency", async () => {
    const { status, body } = await readJson(
      await commit([{ tx: btx({ direction: "debit" }), fate: routeIncome }]),
    );

    expect(status).toBe(400);
    expect(body).toEqual({ error: "A debit cannot be routed to income" });
  });

  it("400 when the batch exceeds the transaction cap", async () => {
    const oversized = Array.from({ length: 1001 }, () => ({ tx: btx(), fate: { kind: "skip" } }));

    const { status, body } = await readJson(await commit(oversized));

    expect(status).toBe(400);
    expect(body).toEqual({ error: "At most 1000 transactions per import" });
  });

  it("409 when a series create hits a name-collision race (P2002)", async () => {
    const p2002 = new PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "6",
    });

    txMock.budgetSeries.create.mockRejectedValue(p2002);

    const { status, body } = await readJson(
      await commit([{ tx: btx(), fate: routeSpending(FAKE_CATEGORY.id, "MIGROS") }]),
    );

    expect(status).toBe(409);
    expect(body).toEqual({ error: "A budget line name collision prevented this import — please retry" });
  });

  it("400 when a text-less transaction is routed without a learnKey", async () => {
    // The app's own routes reject empty names; an import must not smuggle
    // rows past that front door. A learnKey (collected by the review popin
    // before Confirm unlocks) is the escape hatch.
    const textless = btx({ description: "", counterparty: undefined, direction: "credit" });

    const income = await readJson(await commit([{ tx: textless, fate: routeIncome }]));

    expect(income.status).toBe(400);
    expect(income.body).toEqual({ error: "Text-less transactions need a learnKey to be routed" });

    const spending = await readJson(
      await commit([{ tx: textless, fate: routeSpending(FAKE_CATEGORY.id) }]),
    );

    expect(spending.status).toBe(400);
    expect(spending.body).toEqual({ error: "Text-less transactions need a learnKey to be routed" });
  });

  it("400 when a routed category is not owned by the user", async () => {
    prismaMock.category.findMany.mockResolvedValue([]);

    const { status, body } = await readJson(
      await commit([{ tx: btx(), fate: routeSpending("cat-not-mine") }]),
    );

    expect(status).toBe(400);
    expect(body).toEqual({ error: "Category not found for one or more routed transactions" });

    expect(prismaMock.category.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["cat-not-mine"] }, userId: FAKE_USER.id },
    });
  });
});

// --- the atomic commit ----------------------------------------------------

describe("POST /api/import/commit — atomic write", () => {
  it("creates the Import row with server-computed counts and returns them", async () => {
    const batch = [
      { tx: btx(), fate: routeSpending(FAKE_CATEGORY.id, "MIGROS") },
      { tx: btx({ direction: "credit", counterparty: "ACME AG", externalId: "BANKREF003" }), fate: routeIncome },
      { tx: btx({ description: "SOME NOISE" }), fate: { kind: "skip" } },
      { tx: btx({ description: "COOP TANKSTELLE" }), fate: { kind: "alwaysExclude", learnKey: "COOP" } },
      { tx: btx({ description: "WHATEVER FEE" }), fate: routeExclude },
    ];

    const { status, body } = await readJson(
      await commit(batch, {
        filename: "june.mt940",
        statementStart: "2026-06-01",
        statementEnd: "2026-06-30",
      }),
    );

    expect(status).toBe(201);
    expect(body).toEqual({
      importId: "import-1",
      counts: { total: 5, imported: 2, excluded: 3, spending: 1, income: 1 },
    });

    expect(txMock.import.create).toHaveBeenCalledWith({
      data: {
        userId: FAKE_USER.id,
        filename: "june.mt940",
        statementStart: "2026-06-01",
        statementEnd: "2026-06-30",
        totalCount: 5,
        importedCount: 2,
        excludedCount: 3,
      },
    });
  });

  it("routes a spending transaction onto a punctual series and a budgeted-0 incarnation", async () => {
    const tx = btx({
      description: "TWINT BARBER LUIGI 0791234567",
      counterparty: "BARBER LUIGI",
    });

    await commit([{ tx, fate: routeSpending(FAKE_CATEGORY.id, "BARBER") }]);

    expect(txMock.budgetSeries.create).toHaveBeenCalledWith({
      data: {
        name: "BARBER",
        icon: FAKE_CATEGORY.icon,
        recurring: false,
        categoryId: FAKE_CATEGORY.id,
        userId: FAKE_USER.id,
      },
    });

    expect(txMock.spendingItem.upsert).toHaveBeenCalledWith({
      where: { seriesId_month: { seriesId: "series-BARBER", month: "2026-06" } },
      update: {},
      create: { seriesId: "series-BARBER", month: "2026-06", budgeted: 0 },
    });

    expect(txMock.spendingEntry.create).toHaveBeenCalledWith({
      data: {
        name: "BARBER LUIGI",
        amount: 5430,
        direction: "debit",
        date: new Date("2026-06-02"),
        spendingItemId: "item-series-BARBER|2026-06",
        importId: "import-1",
        bankRef: "BANKREF001",
      },
    });
  });

  it("derives the series name from the matched rule key when no learnKey is sent", async () => {
    txMock.categorizationRule.findMany.mockResolvedValue([ruleRow("MIGROS", "spending")]);

    await commit([{ tx: btx(), fate: routeSpending(FAKE_CATEGORY.id) }]);

    expect(txMock.budgetSeries.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "MIGROS" }) }),
    );
  });

  it("falls back to counterparty/description for the series name when nothing matched", async () => {
    await commit([
      { tx: btx({ description: "SOMETHING NEW 123" }), fate: routeSpending(FAKE_CATEGORY.id) },
    ]);

    expect(txMock.budgetSeries.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "SOMETHING NEW 123" }) }),
    );
  });

  it("reuses an existing series and incarnation instead of creating", async () => {
    txMock.budgetSeries.findFirst.mockResolvedValueOnce({
      id: "series-existing",
      name: "MIGROS",
      categoryId: FAKE_CATEGORY.id,
    });

    await commit([{ tx: btx(), fate: routeSpending(FAKE_CATEGORY.id, "MIGROS") }]);

    expect(txMock.budgetSeries.create).not.toHaveBeenCalled();

    expect(txMock.spendingEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ spendingItemId: "item-series-existing|2026-06" }),
      }),
    );
  });

  it("importing the same collided merchant twice yields one series, never two", async () => {
    // In-batch convergence: two same-merchant transactions in one commit
    // resolve through the cache to a single series with two incarnations.
    await commit([
      { tx: btx({ date: "2026-06-02" }), fate: routeSpending(FAKE_CATEGORY.id, "MIGROS") },
      { tx: btx({ date: "2026-07-01" }), fate: routeSpending(FAKE_CATEGORY.id, "MIGROS") },
    ]);

    expect(txMock.budgetSeries.create).toHaveBeenCalledTimes(1);
    expect(txMock.spendingItem.upsert).toHaveBeenCalledTimes(2);

    // Cross-import convergence: the fallback name created by a previous
    // collided import IS the target series — reused, never a third name.
    vi.clearAllMocks();
    getAuthenticatedUser.mockResolvedValue(FAKE_USER);
    prismaMock.user.upsert.mockResolvedValue({});
    prismaMock.category.findMany.mockResolvedValue([FAKE_CATEGORY]);
    prismaMock.$transaction.mockImplementation(
      async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock),
    );
    txMock.import.create.mockResolvedValue({ id: "import-2" });
    txMock.categorizationRule.findMany.mockResolvedValue([]);
    txMock.spendingEntry.findMany.mockResolvedValue([]);
    txMock.spendingItem.update.mockResolvedValue({});
    txMock.spendingItem.upsert.mockResolvedValue({ id: "item-fb", seriesId: "series-fb", month: "2026-06" });
    txMock.spendingEntry.create.mockResolvedValue({ id: "entry-1" });
    txMock.budgetSeries.findFirst
      .mockResolvedValueOnce(null) // "MIGROS" not in this category
      .mockResolvedValueOnce({ id: "series-other", name: "MIGROS", categoryId: "cat-other" }) // name taken elsewhere
      .mockResolvedValueOnce({ id: "series-fb", name: "MIGROS — Groceries", categoryId: FAKE_CATEGORY.id });

    await commit([{ tx: btx(), fate: routeSpending(FAKE_CATEGORY.id, "MIGROS") }]);

    expect(txMock.budgetSeries.create).not.toHaveBeenCalled();

    expect(txMock.budgetSeries.findFirst).toHaveBeenNthCalledWith(3, {
      where: { userId: FAKE_USER.id, categoryId: FAKE_CATEGORY.id, name: "MIGROS — Groceries" },
    });

    expect(txMock.spendingItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { seriesId_month: { seriesId: "series-fb", month: "2026-06" } },
      }),
    );
  });

  it("creates the category-scoped fallback series on first collision", async () => {
    txMock.budgetSeries.findFirst
      .mockResolvedValueOnce(null) // "MIGROS" not in this category
      .mockResolvedValueOnce({ id: "series-other", name: "MIGROS", categoryId: "cat-other" }) // taken elsewhere
      .mockResolvedValueOnce(null); // fallback name free

    await commit([{ tx: btx(), fate: routeSpending(FAKE_CATEGORY.id, "MIGROS") }]);

    expect(txMock.budgetSeries.create).toHaveBeenCalledWith({
      data: {
        name: "MIGROS — Groceries",
        icon: FAKE_CATEGORY.icon,
        recurring: false,
        categoryId: FAKE_CATEGORY.id,
        userId: FAKE_USER.id,
      },
    });
  });

  it("routes a credit to income with the synthesized defaults", async () => {
    const tx = btx({
      direction: "credit",
      amount: 250000,
      date: "2026-06-03",
      description: "SALARY PAYMENT",
      counterparty: "ACME AG",
      externalId: "BANKREF003",
    });

    await commit([{ tx, fate: routeIncome }]);

    expect(txMock.incomeSource.create).toHaveBeenCalledWith({
      data: {
        name: "ACME AG",
        amount: 250000,
        icon: DEFAULT_INCOME_ICON,
        type: "active",
        startDate: new Date("2026-06-03"),
        month: "2026-06",
        userId: FAKE_USER.id,
        importId: "import-1",
        bankRef: "BANKREF003",
      },
    });
  });

  it("truncates a synthesized income name to the income route's 100-char cap", async () => {
    const tx = btx({ direction: "credit", description: "X".repeat(120), counterparty: undefined });

    await commit([{ tx, fate: routeIncome }]);

    const arg = txMock.incomeSource.create.mock.calls[0][0] as { data: { name: string } };

    expect(arg.data.name).toBe("X".repeat(100));
  });

  it("alwaysExclude creates the exclude rule and NO entry", async () => {
    await commit([
      { tx: btx({ description: "COOP TANKSTELLE" }), fate: { kind: "alwaysExclude", learnKey: "coop" } },
    ]);

    expect(txMock.categorizationRule.create).toHaveBeenCalledWith({
      data: { userId: FAKE_USER.id, match: "COOP", valueType: "exclude", categoryId: null },
    });

    expect(txMock.spendingEntry.create).not.toHaveBeenCalled();

    expect(txMock.incomeSource.create).not.toHaveBeenCalled();

    expect(txMock.import.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ totalCount: 1, importedCount: 0, excludedCount: 1 }),
      }),
    );
  });

  it("skip produces zero mutations even inside a mixed batch", async () => {
    await commit([
      { tx: btx(), fate: { kind: "skip" } },
      { tx: btx({ description: "BARBER LUIGI" }), fate: routeSpending(FAKE_CATEGORY.id, "BARBER") },
    ]);

    // Exactly one rule write in the whole batch — BARBER's create. Nothing,
    // create or bump, references the skipped MIGROS transaction (D20).
    expect(txMock.categorizationRule.create).toHaveBeenCalledTimes(1);
    expect(txMock.categorizationRule.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ match: "BARBER" }) }),
    );

    expect(txMock.categorizationRule.updateMany).not.toHaveBeenCalled();

    expect(txMock.spendingEntry.create).toHaveBeenCalledTimes(1);

    expect(txMock.import.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ totalCount: 2, importedCount: 1, excludedCount: 1 }),
      }),
    );
  });

  it("bumps an existing rule with one aggregated increment", async () => {
    txMock.categorizationRule.findMany.mockResolvedValue([ruleRow("MIGROS", "spending")]);

    await commit([
      { tx: btx({ date: "2026-06-02" }), fate: routeSpending(FAKE_CATEGORY.id) },
      { tx: btx({ date: "2026-06-09" }), fate: routeSpending(FAKE_CATEGORY.id) },
    ]);

    expect(txMock.categorizationRule.create).not.toHaveBeenCalled();

    // Bumps of pre-existing rows resolve to concrete ids: the read side
    // compared normalized keys, so the write side must not re-filter on the
    // raw stored string (an un-normalized stored key would silently no-op).
    expect(txMock.categorizationRule.updateMany).toHaveBeenCalledTimes(1);
    expect(txMock.categorizationRule.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["rule-MIGROS-spending"] } },
      data: { useCount: { increment: 2 } },
    });
  });

  it("spent recomputation goes through applyEntry with a batch containing both debits and credits", async () => {
    // Both transactions land on the same incarnation; the recompute must be
    // the signed sum (debit adds, credit subtracts): 5430 − 2000 = 3430.
    txMock.spendingEntry.findMany.mockResolvedValue([
      { amount: 5430, direction: "debit" },
      { amount: 2000, direction: "credit" },
    ]);

    await commit([
      { tx: btx({ amount: 5430, direction: "debit" }), fate: routeSpending(FAKE_CATEGORY.id, "MIGROS") },
      { tx: btx({ amount: 2000, direction: "credit" }), fate: routeSpending(FAKE_CATEGORY.id, "MIGROS") },
    ]);

    expect(txMock.spendingEntry.findMany).toHaveBeenCalledWith({
      where: { spendingItemId: "item-series-MIGROS|2026-06" },
      select: { amount: true, direction: true },
    });

    expect(txMock.spendingItem.update).toHaveBeenCalledTimes(1);
    expect(txMock.spendingItem.update).toHaveBeenCalledWith({
      where: { id: "item-series-MIGROS|2026-06" },
      data: { spent: 3430 },
    });
  });

  it("a mid-transaction failure persists nothing", async () => {
    txMock.spendingEntry.create.mockRejectedValue(new Error("db down"));

    const { status, body } = await readJson(
      await commit([{ tx: btx(), fate: routeSpending(FAKE_CATEGORY.id, "MIGROS") }]),
    );

    expect(status).toBe(500);
    expect(body).toEqual({ error: "Failed to commit import" });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);

    // Every import write must have gone through the transaction client —
    // zero writes on the outer client means the DB rollback covers them all.
    const outerImportModels = [
      "import",
      "spendingEntry",
      "spendingItem",
      "budgetSeries",
      "incomeSource",
      "categorizationRule",
    ] as const;

    for (const name of outerImportModels) {
      for (const fn of WRITE_FNS) expect((prismaMock[name] as Record<string, Mock>)[fn], `outer prisma.${name}.${fn}`).not.toHaveBeenCalled();
    }
  });
});

// --- rule→series pointer (rename-proof routing) -----------------------------

describe("POST /api/import/commit — rule→series pointer", () => {
  it("routes via a live rule pointer without consulting the name ladder", async () => {
    txMock.categorizationRule.findMany.mockResolvedValue([
      ruleRow("MIGROS", "spending", { seriesId: "series-pointer" }),
    ]);

    await commit([{ tx: btx(), fate: routeSpending(FAKE_CATEGORY.id) }]);

    // Placement came from the pointer alone — the ladder's lookups never ran.
    expect(txMock.budgetSeries.findFirst).not.toHaveBeenCalled();

    expect(txMock.budgetSeries.create).not.toHaveBeenCalled();

    expect(txMock.spendingItem.upsert).toHaveBeenCalledWith({
      where: { seriesId_month: { seriesId: "series-pointer", month: "2026-06" } },
      update: {},
      create: { seriesId: "series-pointer", month: "2026-06", budgeted: 0 },
    });

    expect(txMock.spendingEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ spendingItemId: "item-series-pointer|2026-06" }) }),
    );
  });

  it("rename-proof: a renamed pointered series keeps receiving entries, no new series", async () => {
    // The user renamed the card "MIGROS" → "Twint Migros" after the rule was
    // stamped. Nothing in the commit consults the series name — the pointer
    // alone places both entries, so the rename cannot split the card.
    txMock.categorizationRule.findMany.mockResolvedValue([
      ruleRow("MIGROS", "spending", { seriesId: "series-renamed" }),
    ]);

    await commit([
      { tx: btx({ date: "2026-06-02" }), fate: routeSpending(FAKE_CATEGORY.id) },
      { tx: btx({ date: "2026-06-09" }), fate: routeSpending(FAKE_CATEGORY.id) },
    ]);

    expect(txMock.budgetSeries.findFirst).not.toHaveBeenCalled();

    expect(txMock.budgetSeries.create).not.toHaveBeenCalled();

    expect(txMock.spendingItem.upsert).toHaveBeenCalledTimes(1);
    expect(txMock.spendingItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { seriesId_month: { seriesId: "series-renamed", month: "2026-06" } } }),
    );

    expect(txMock.spendingEntry.create).toHaveBeenCalledTimes(2);
    expect(txMock.spendingEntry.create).toHaveBeenNthCalledWith(1,
      expect.objectContaining({ data: expect.objectContaining({ spendingItemId: "item-series-renamed|2026-06" }) }),
    );
    expect(txMock.spendingEntry.create).toHaveBeenNthCalledWith(2,
      expect.objectContaining({ data: expect.objectContaining({ spendingItemId: "item-series-renamed|2026-06" }) }),
    );
  });

  it("pointer wins: a series moved to another category keeps its entries, rule.categoryId untouched", async () => {
    // The card was moved to another category after stamping (PUT /api/spending
    // updates series.categoryId; rules are untouched). The rule still stores
    // Groceries and the review UI pre-fills it — but the entry follows the
    // card (the user's later, deliberate move is ground truth, D16). No
    // split, no second series, and the rule's own category is not rewritten.
    txMock.categorizationRule.findMany.mockResolvedValue([
      ruleRow("MIGROS", "spending", { seriesId: "series-moved" }),
    ]);

    await commit([{ tx: btx(), fate: routeSpending(FAKE_CATEGORY.id) }]);

    expect(txMock.spendingItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { seriesId_month: { seriesId: "series-moved", month: "2026-06" } } }),
    );

    expect(txMock.budgetSeries.create).not.toHaveBeenCalled();

    expect(txMock.budgetSeries.update).not.toHaveBeenCalled();

    // The confirmation bumps useCount — and writes nothing else to the rule.
    expect(txMock.categorizationRule.update).not.toHaveBeenCalled();

    expect(txMock.categorizationRule.updateMany).toHaveBeenCalledTimes(1);
    expect(txMock.categorizationRule.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["rule-MIGROS-spending"] } },
      data: { useCount: { increment: 1 } },
    });
  });

  it("re-stamps a null pointer from the ladder inside the same transaction", async () => {
    // The pointered series was deleted — the FK nulled the pointer. The
    // ladder resolves a home again and the rule immediately re-learns it,
    // atomically with the entries it placed.
    txMock.categorizationRule.findMany.mockResolvedValue([
      ruleRow("MIGROS", "spending", { seriesId: null }),
    ]);
    txMock.budgetSeries.findFirst.mockResolvedValueOnce({ id: "series-back", name: "MIGROS", categoryId: FAKE_CATEGORY.id });

    await commit([{ tx: btx(), fate: routeSpending(FAKE_CATEGORY.id) }]);

    expect(txMock.spendingItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { seriesId_month: { seriesId: "series-back", month: "2026-06" } } }),
    );

    expect(txMock.categorizationRule.update).toHaveBeenCalledTimes(1);
    expect(txMock.categorizationRule.update).toHaveBeenCalledWith({
      where: { id: "rule-MIGROS-spending" },
      data: { seriesId: "series-back" },
    });

    expect(prismaMock.categorizationRule.update).not.toHaveBeenCalled();
  });

  it("first-use stamp: one stamp, and the batch's second transaction takes the pointer path", async () => {
    // Pre-pointer-era rule (seriesId never stamped). The first transaction
    // resolves through the ladder and stamps; the second must already see
    // the pointer in the in-memory snapshot — one stamp total, one ladder
    // pass, both incarnations on the stamped series.
    txMock.categorizationRule.findMany.mockResolvedValue([
      ruleRow("MIGROS", "spending", { seriesId: null }),
    ]);
    txMock.budgetSeries.findFirst.mockResolvedValueOnce({ id: "series-learned", name: "MIGROS", categoryId: FAKE_CATEGORY.id });

    await commit([
      { tx: btx({ date: "2026-06-02" }), fate: routeSpending(FAKE_CATEGORY.id) },
      { tx: btx({ date: "2026-07-01" }), fate: routeSpending(FAKE_CATEGORY.id) },
    ]);

    expect(txMock.categorizationRule.update).toHaveBeenCalledTimes(1);
    expect(txMock.categorizationRule.update).toHaveBeenCalledWith({
      where: { id: "rule-MIGROS-spending" },
      data: { seriesId: "series-learned" },
    });

    expect(txMock.budgetSeries.findFirst).toHaveBeenCalledTimes(1);

    expect(txMock.spendingItem.upsert).toHaveBeenNthCalledWith(1,
      expect.objectContaining({ where: { seriesId_month: { seriesId: "series-learned", month: "2026-06" } } }),
    );
    expect(txMock.spendingItem.upsert).toHaveBeenNthCalledWith(2,
      expect.objectContaining({ where: { seriesId_month: { seriesId: "series-learned", month: "2026-07" } } }),
    );
  });

  it("a rule created by this batch is born with its seriesId stamped", async () => {
    // New merchant, user-confirmed token: the ladder creates the card and
    // the learned rule is born already pointing at it — self-healing from
    // birth, not on second use.
    await commit([{ tx: btx(), fate: routeSpending(FAKE_CATEGORY.id, "MIGROS") }]);

    expect(txMock.categorizationRule.create).toHaveBeenCalledWith({
      data: {
        userId: FAKE_USER.id,
        match: "MIGROS",
        valueType: "spending",
        categoryId: FAKE_CATEGORY.id,
        seriesId: "series-MIGROS",
      },
    });
  });

  it("a category correction routes by the ladder, not the old rule's pointer", async () => {
    // The decision names a different category than the pointered rule — the
    // old pointer must not hijack the user's correction. The correction
    // learns a NEW row under the same key (born stamped with the corrected
    // card); the old rule is never touched (history is history).
    const RESTAURANTS = { id: "cat-restaurants", label: "Restaurants", icon: "utensils", color: "#FF9500", userId: FAKE_USER.id };

    prismaMock.category.findMany.mockResolvedValue([RESTAURANTS]);
    txMock.categorizationRule.findMany.mockResolvedValue([
      ruleRow("MIGROS", "spending", { seriesId: "series-groceries" }),
    ]);

    await commit([{ tx: btx(), fate: routeSpending(RESTAURANTS.id) }]);

    expect(txMock.spendingItem.upsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { seriesId_month: expect.objectContaining({ seriesId: "series-groceries" }) } }),
    );

    expect(txMock.budgetSeries.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "MIGROS", categoryId: RESTAURANTS.id }) }),
    );

    expect(txMock.categorizationRule.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ match: "MIGROS", categoryId: RESTAURANTS.id, seriesId: "series-MIGROS" }) }),
    );

    expect(txMock.categorizationRule.update).not.toHaveBeenCalled();
  });

  it("anti-fork: a ruleId confirmation under the pointer's effective category bumps once, creates nothing", async () => {
    // The card moved to Restaurants after stamping; the preview showed that
    // effective destination and the confirmation carries it plus the
    // concrete ruleId. One bump on that rule, zero new rule rows, zero new
    // series — without the ruleId, the planner's identity lookup would fork
    // a phantom row under Restaurants and self-downgrade the MIGROS key
    // from confident to suggested (the re-split disease at rule level).
    const RESTAURANTS = { id: "cat-restaurants", label: "Restaurants", icon: "utensils", color: "#FF9500", userId: FAKE_USER.id };

    prismaMock.category.findMany.mockResolvedValue([RESTAURANTS]);
    prismaMock.categorizationRule.findMany.mockResolvedValue([ruleRow("MIGROS", "spending", { seriesId: "series-x" })]);
    txMock.categorizationRule.findMany.mockResolvedValue([ruleRow("MIGROS", "spending", { seriesId: "series-x" })]);

    const { status } = await readJson(await commit([
      { tx: btx(), fate: { kind: "route", value: { type: "spending", categoryId: RESTAURANTS.id }, ruleId: "rule-MIGROS-spending" } },
    ]));

    expect(status).toBe(201);

    // The entry follows the pointer — no ladder, no split.
    expect(txMock.budgetSeries.findFirst).not.toHaveBeenCalled();

    expect(txMock.budgetSeries.create).not.toHaveBeenCalled();

    expect(txMock.spendingItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { seriesId_month: { seriesId: "series-x", month: "2026-06" } } }),
    );

    // One bump by concrete id, zero creates — the rule's stored category is
    // untouched and demotes to the ladder fallback.
    expect(txMock.categorizationRule.create).not.toHaveBeenCalled();

    expect(txMock.categorizationRule.updateMany).toHaveBeenCalledTimes(1);
    expect(txMock.categorizationRule.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["rule-MIGROS-spending"] } },
      data: { useCount: { increment: 1 } },
    });
  });

  it("a dead pointer re-homes to the fate's category and re-stamps the confirmed rule by id", async () => {
    // The pointer died between preview and commit (series deleted, FK nulled
    // it): the ladder runs in the category the user actually confirmed (the
    // effective one from preview), and the rule re-learns the new card —
    // never a phantom rule row.
    const RESTAURANTS = { id: "cat-restaurants", label: "Restaurants", icon: "utensils", color: "#FF9500", userId: FAKE_USER.id };

    prismaMock.category.findMany.mockResolvedValue([RESTAURANTS]);
    prismaMock.categorizationRule.findMany.mockResolvedValue([ruleRow("MIGROS", "spending", { seriesId: null })]);
    txMock.categorizationRule.findMany.mockResolvedValue([ruleRow("MIGROS", "spending", { seriesId: null })]);

    await commit([
      { tx: btx(), fate: { kind: "route", value: { type: "spending", categoryId: RESTAURANTS.id }, ruleId: "rule-MIGROS-spending" } },
    ]);

    expect(txMock.budgetSeries.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "MIGROS", categoryId: RESTAURANTS.id }) }),
    );

    expect(txMock.categorizationRule.create).not.toHaveBeenCalled();

    expect(txMock.categorizationRule.update).toHaveBeenCalledTimes(1);
    expect(txMock.categorizationRule.update).toHaveBeenCalledWith({
      where: { id: "rule-MIGROS-spending" },
      data: { seriesId: "series-MIGROS" },
    });
  });

  it("an explicit learnKey outranks the ruleId — identity edit, not confirmation", async () => {
    prismaMock.categorizationRule.findMany.mockResolvedValue([ruleRow("MIGROS", "spending", { seriesId: "series-x" })]);
    txMock.categorizationRule.findMany.mockResolvedValue([ruleRow("MIGROS", "spending", { seriesId: "series-x" })]);

    await commit([
      { tx: btx(), fate: { kind: "route", value: { type: "spending", categoryId: FAKE_CATEGORY.id }, ruleId: "rule-MIGROS-spending", learnKey: "MIGROS ZUERICH" } },
    ]);

    // The edited token names a NEW identity: the ladder places the entry
    // under it — the old rule's pointer must not hijack the edit...
    expect(txMock.spendingItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ seriesId_month: expect.objectContaining({ seriesId: "series-MIGROS ZUERICH" }) }) }),
    );

    // ...and a NEW rule is born stamped; the referenced rule is not bumped.
    expect(txMock.categorizationRule.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ match: "MIGROS ZUERICH", seriesId: "series-MIGROS ZUERICH" }) }),
    );

    expect(txMock.categorizationRule.updateMany).not.toHaveBeenCalled();
  });

  it("400 when the ruleId is not the caller's own rule", async () => {
    prismaMock.categorizationRule.findMany.mockResolvedValue([]);

    const { status, body } = await readJson(await commit([
      { tx: btx(), fate: { kind: "route", value: { type: "spending", categoryId: FAKE_CATEGORY.id }, ruleId: "rule-foreign" } },
    ]));

    expect(status).toBe(400);
    expect(body).toEqual({ error: "Rule not found for one or more confirmed transactions" });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("400 when the confirmed rule does not match the transaction's text", async () => {
    prismaMock.categorizationRule.findMany.mockResolvedValue([ruleRow("COOP", "spending")]);

    const { status, body } = await readJson(await commit([
      { tx: btx(), fate: { kind: "route", value: { type: "spending", categoryId: FAKE_CATEGORY.id }, ruleId: "rule-COOP-spending" } },
    ]));

    expect(status).toBe(400);
    expect(body).toEqual({ error: "A confirmed rule does not match its transaction" });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("400 when the confirmed rule's destination type differs from the fate's", async () => {
    prismaMock.categorizationRule.findMany.mockResolvedValue([ruleRow("MIGROS", "income")]);

    const { status, body } = await readJson(await commit([
      { tx: btx({ direction: "credit" }), fate: { kind: "route", value: { type: "spending", categoryId: FAKE_CATEGORY.id }, ruleId: "rule-MIGROS-income" } },
    ]));

    expect(status).toBe(400);
    expect(body).toEqual({ error: "A confirmed rule does not match its fate destination" });
  });

  it("400 on a malformed ruleId", async () => {
    const { status, body } = await readJson(await commit([
      { tx: btx(), fate: { kind: "route", value: { type: "spending", categoryId: FAKE_CATEGORY.id }, ruleId: 42 } },
    ]));

    expect(status).toBe(400);
    expect(body).toEqual({ error: "ruleId must be a non-empty string" });
  });

  it("income and exclude rules never carry a seriesId", async () => {
    await commit([
      { tx: btx({ direction: "credit", description: "ACME SALARY" }), fate: { kind: "route", value: { type: "income" }, learnKey: "ACME" } },
      { tx: btx({ description: "COOP TANKSTELLE" }), fate: { kind: "alwaysExclude", learnKey: "COOP" } },
    ]);

    expect(txMock.categorizationRule.create).toHaveBeenCalledTimes(2);
    expect(txMock.categorizationRule.create).toHaveBeenCalledWith({
      data: { userId: FAKE_USER.id, match: "ACME", valueType: "income", categoryId: null },
    });
    expect(txMock.categorizationRule.create).toHaveBeenCalledWith({
      data: { userId: FAKE_USER.id, match: "COOP", valueType: "exclude", categoryId: null },
    });

    expect(txMock.categorizationRule.update).not.toHaveBeenCalled();
  });
});
