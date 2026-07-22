import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { FAKE_USER, jsonRequest, readJson } from "../../__tests__/helpers";

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
    prismaMock: {
      categorizationRule: model(),
      import: model(),
      spendingEntry: model(),
      spendingItem: model(),
      incomeSource: model(),
      budgetSeries: model(),
      user: model(),
      $transaction: vi.fn(),
    },
    getAuthenticatedUser: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUser }));

import { POST } from "@/app/api/import/preview/route";

// --- fixtures -------------------------------------------------------------

/** Joins MT940 lines with CRLF, the line ending SWIFT files use in the wild. */
const mt940 = (...lines: string[]): string => lines.join("\r\n");

// One statement, three transactions exercising all three tiers:
// MIGROS debit (confident), COOP debit (suggested), text-less credit (unknown).
// Balances reconcile: 1000.00 − 54.30 − 10.00 + 2500.00 = 3435.70.
const THREE_TIER_STATEMENT = mt940(
  ":20:STMT-REF-001",
  ":25:CH1234567890",
  ":28C:00001/001",
  ":60F:C260601CHF1000,00",
  ":61:2606020602D54,30NTRFNONREF//BANKREF001",
  ":86:MIGROS SUPERMARKT ZUERICH",
  ":61:2606020602D10,00NTRFNONREF//BANKREF002",
  ":86:COOP PRONTO ZUERICH",
  ":61:2606030603C2500,00NTRFSALARY//BANKREF003",
  ":62F:C260603CHF3435,70",
  "-",
);

// Two statements (CHF then EUR), one transaction each, both reconciling.
const TWO_STATEMENTS = mt940(
  ":20:STMT-A",
  ":25:CH1234567890",
  ":28C:00001/001",
  ":60F:C260601CHF100,00",
  ":61:2606020602D10,00NTRFNONREF//REF-A1",
  ":86:MIGROS X",
  ":62F:C260602CHF90,00",
  "-",
  ":20:STMT-B",
  ":25:CH1234567890",
  ":28C:00002/001",
  ":60F:C260601EUR50,00",
  ":61:2606050605C20,00NTRFNONREF//REF-B1",
  ":86:ACME PAYOUT",
  ":62F:C260605EUR70,00",
  "-",
);

let seq = 0;

const ruleRow = (
  match: string,
  valueType: "income" | "spending" | "exclude",
  over: Record<string, unknown> = {},
) => ({
  id: `rule-${++seq}`,
  userId: FAKE_USER.id,
  match,
  valueType,
  categoryId: valueType === "spending" ? "cat-groceries" : null,
  seriesId: null,
  useCount: 1,
  ...over,
});

/** Loosely-typed view of the response body for structural assertions. */
type PreviewBody = {
  reconciliation: Array<Record<string, unknown>>;
  transactions: Array<{
    tx: Record<string, unknown>;
    match: {
      tier: string;
      candidate?: { rule: { id: string }; value: unknown; ruleId?: string; destination?: unknown };
      candidates?: Array<{ rule: { id: string }; value: unknown; ruleId?: string; destination?: unknown }>;
    };
    statementIndex: number;
  }>;
};

const WRITE_FNS = ["create", "createMany", "update", "upsert", "delete", "deleteMany"] as const;

beforeEach(() => {
  vi.clearAllMocks();
  getAuthenticatedUser.mockResolvedValue(FAKE_USER);
  prismaMock.categorizationRule.findMany.mockResolvedValue([]);
});

// --- auth & validation ----------------------------------------------------

describe("POST /api/import/preview — auth & validation", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);

    const { status, body } = await readJson(await POST(jsonRequest({ content: "x" })));

    expect(status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it.each([
    { payload: {}, label: "missing" },
    { payload: { content: 42 }, label: "not a string" },
    { payload: { content: "" }, label: "empty" },
    { payload: { content: "   " }, label: "blank" },
  ])("400 when content is invalid ($label)", async ({ payload }) => {
    const { status, body } = await readJson(await POST(jsonRequest(payload)));

    expect(status).toBe(400);
    expect(body).toEqual({ error: "Content must be a non-empty string" });
  });

  it("422 when the content is not recognizable MT940", async () => {
    const { status, body } = await readJson(
      await POST(jsonRequest({ content: "date,amount\n2026-01-01,12.50" })),
    );

    expect(status).toBe(422);
    expect(body).toEqual({ error: "Unrecognized statement format (expected MT940)" });
  });

  it("422 with the parser's own message on a malformed :61: line, before any rule load", async () => {
    const malformed = mt940(
      ":20:STMT-REF-001",
      ":60F:C260601CHF1000,00",
      ":61:not-a-statement-line",
      "-",
    );

    const { status, body } = await readJson(await POST(jsonRequest({ content: malformed })));

    expect(status).toBe(422);
    expect(body).toEqual({ error: 'Malformed :61: line: "not-a-statement-line"' });

    expect(prismaMock.categorizationRule.findMany).not.toHaveBeenCalled();
  });

  it("500 when the rules load fails", async () => {
    prismaMock.categorizationRule.findMany.mockRejectedValue(new Error("boom"));

    const { status, body } = await readJson(
      await POST(jsonRequest({ content: THREE_TIER_STATEMENT })),
    );

    expect(status).toBe(500);
    expect(body).toEqual({ error: "Failed to preview import" });
  });
});

// --- categorization mapping -----------------------------------------------

describe("POST /api/import/preview — categorization", () => {
  it("maps all three tiers end-to-end and loads the rules exactly once", async () => {
    const migros = ruleRow("MIGROS", "spending");
    const coopSpending = ruleRow("COOP", "spending", { useCount: 5 });
    const coopExclude = ruleRow("COOP", "exclude");

    prismaMock.categorizationRule.findMany.mockResolvedValue([migros, coopSpending, coopExclude]);

    const { status, body } = await readJson(
      await POST(jsonRequest({ content: THREE_TIER_STATEMENT })),
    );

    expect(status).toBe(200);

    const data = body as PreviewBody;

    expect(data.reconciliation).toHaveLength(1);
    expect(data.reconciliation[0]).toMatchObject({
      reconciled: true,
      movement: 243570,
      expectedClosing: 343570,
      actualClosing: 343570,
      difference: 0,
    });

    expect(data.transactions).toHaveLength(3);

    const [first, second, third] = data.transactions;

    expect(first.tx).toMatchObject({
      description: "MIGROS SUPERMARKT ZUERICH",
      amount: 5430,
      direction: "debit",
      externalId: "BANKREF001",
    });
    expect(first.statementIndex).toBe(0);
    expect(first.match).toEqual({
      tier: "confident",
      candidate: {
        rule: expect.objectContaining({ id: migros.id }),
        value: { type: "spending", categoryId: "cat-groceries" },
        ruleId: migros.id,
        destination: null,
      },
    });

    expect(second.tx).toMatchObject({ description: "COOP PRONTO ZUERICH", amount: 1000 });
    expect(second.match).toEqual({
      tier: "suggested",
      candidates: [
        {
          rule: expect.objectContaining({ id: coopSpending.id }),
          value: { type: "spending", categoryId: "cat-groceries" },
          ruleId: coopSpending.id,
          destination: null,
        },
        {
          rule: expect.objectContaining({ id: coopExclude.id }),
          value: { type: "exclude" },
          ruleId: coopExclude.id,
          destination: null,
        },
      ],
    });

    expect(third.tx).toMatchObject({ amount: 250000, direction: "credit" });
    expect(third.match).toEqual({ tier: "unknown" });

    expect(prismaMock.categorizationRule.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.categorizationRule.findMany).toHaveBeenCalledWith({
      where: { userId: FAKE_USER.id },
    });
  });

  it("preserves statement membership: statementIndex links into the reconciliation array", async () => {
    const { status, body } = await readJson(await POST(jsonRequest({ content: TWO_STATEMENTS })));

    expect(status).toBe(200);

    const data = body as PreviewBody;

    expect(data.reconciliation).toHaveLength(2);
    expect(data.reconciliation[0]).toMatchObject({ reconciled: true, difference: 0 });
    expect(data.reconciliation[1]).toMatchObject({ reconciled: true, difference: 0 });

    expect(data.transactions).toHaveLength(2);
    expect(data.transactions[0].statementIndex).toBe(0);
    expect(data.transactions[0].tx).toMatchObject({ description: "MIGROS X" });
    expect(data.transactions[1].statementIndex).toBe(1);
    expect(data.transactions[1].tx).toMatchObject({ description: "ACME PAYOUT", direction: "credit" });
  });
});

// --- effective destinations (rule→series pointer) ---------------------------

describe("POST /api/import/preview — effective destinations", () => {
  it("pointered candidates carry the series' live coordinates from ONE batched load", async () => {
    // Both cards were renamed/moved since their rules were stamped; the UI
    // must display where entries will actually land — the series' current
    // name and category, not the rule's stale copy.
    const migros = ruleRow("MIGROS", "spending", { seriesId: "series-x" });
    const coop = ruleRow("COOP", "spending", { seriesId: "series-y" });

    prismaMock.categorizationRule.findMany.mockResolvedValue([migros, coop]);
    prismaMock.budgetSeries.findMany.mockResolvedValue([
      { id: "series-x", name: "Twint Migros", categoryId: "cat-restaurants" },
      { id: "series-y", name: "Coop Pronto", categoryId: "cat-transport" },
    ]);

    const { status, body } = await readJson(
      await POST(jsonRequest({ content: THREE_TIER_STATEMENT })),
    );

    expect(status).toBe(200);

    const data = body as PreviewBody;
    const [first, second] = data.transactions;

    expect(first.match.candidate).toMatchObject({
      ruleId: migros.id,
      destination: { seriesId: "series-x", name: "Twint Migros", categoryId: "cat-restaurants" },
    });

    expect(second.match.candidate).toMatchObject({
      ruleId: coop.id,
      destination: { seriesId: "series-y", name: "Coop Pronto", categoryId: "cat-transport" },
    });

    // One batched series load, scoped to the caller — never per candidate.
    expect(prismaMock.budgetSeries.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.budgetSeries.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["series-x", "series-y"] }, userId: FAKE_USER.id },
      select: { id: true, name: true, categoryId: true },
    });
  });

  it("an unpointered rule yields destination null and no series query at all", async () => {
    const migros = ruleRow("MIGROS", "spending");

    prismaMock.categorizationRule.findMany.mockResolvedValue([migros]);

    const { body } = await readJson(await POST(jsonRequest({ content: TWO_STATEMENTS })));

    const data = body as PreviewBody;

    expect(data.transactions[0].match.candidate).toMatchObject({ ruleId: migros.id, destination: null });

    expect(prismaMock.budgetSeries.findMany).not.toHaveBeenCalled();
  });

  it("suggested candidates are enriched independently", async () => {
    const pointered = ruleRow("COOP", "spending", { useCount: 5, seriesId: "series-y" });
    const bare = ruleRow("COOP", "exclude");

    prismaMock.categorizationRule.findMany.mockResolvedValue([pointered, bare]);
    prismaMock.budgetSeries.findMany.mockResolvedValue([
      { id: "series-y", name: "Coop Pronto", categoryId: "cat-transport" },
    ]);

    const { body } = await readJson(await POST(jsonRequest({ content: THREE_TIER_STATEMENT })));

    const data = body as PreviewBody;
    const coopMatch = data.transactions[1].match;

    expect(coopMatch.tier).toBe("suggested");
    expect(coopMatch.candidates?.[0]).toMatchObject({
      ruleId: pointered.id,
      destination: { seriesId: "series-y", name: "Coop Pronto", categoryId: "cat-transport" },
    });
    expect(coopMatch.candidates?.[1]).toMatchObject({ ruleId: bare.id, destination: null });
  });

  it("a pointer whose series vanished mid-flight degrades to destination null", async () => {
    prismaMock.categorizationRule.findMany.mockResolvedValue([
      ruleRow("MIGROS", "spending", { seriesId: "series-gone" }),
    ]);
    prismaMock.budgetSeries.findMany.mockResolvedValue([]);

    const { body } = await readJson(await POST(jsonRequest({ content: TWO_STATEMENTS })));

    const data = body as PreviewBody;

    expect(data.transactions[0].match.candidate).toMatchObject({ destination: null });
  });
});

// --- D19: preview is pure staging ------------------------------------------

describe("POST /api/import/preview — no writes, ever (D19)", () => {
  it("performs zero persistence calls on a successful preview", async () => {
    prismaMock.categorizationRule.findMany.mockResolvedValue([ruleRow("MIGROS", "spending")]);

    const { status } = await readJson(await POST(jsonRequest({ content: THREE_TIER_STATEMENT })));

    expect(status).toBe(200);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();

    for (const [name, model] of Object.entries(prismaMock)) {
      if (name === "$transaction") continue;

      for (const fn of WRITE_FNS) expect((model as Record<string, Mock>)[fn], `${name}.${fn}`).not.toHaveBeenCalled();
    }
  });
});
