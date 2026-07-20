import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mt940Parser, Mt940ParseError } from "@/lib/import/mt940-parser";
import { matchTransaction } from "@/lib/categorize/match";
import type { BankStatement, ReconciliationResult } from "@/lib/import/types";

/**
 * POST /api/import/preview — pure staging (D19): parses an MT940 file, runs
 * every transaction through the rule matcher and reports per-statement
 * reconciliation. Performs NO writes of any kind; the single DB access is
 * loading the caller's rules. `statementIndex` on each transaction links it
 * into the `reconciliation` array (one entry per statement, in file order) so
 * the review UI can render per-statement reconciliation warnings.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const user = await getAuthenticatedUser();

    if (user === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as Record<string, unknown>;
    const content = body.content;

    if (typeof content !== "string" || content.trim().length === 0) return NextResponse.json({ error: "Content must be a non-empty string" }, { status: 400 });

    if (!mt940Parser.canParse(content)) return NextResponse.json({ error: "Unrecognized statement format (expected MT940)" }, { status: 422 });

    // Parse before touching the DB — a malformed file must answer 422 with
    // the parser's own message and cost nothing else.
    let statements: BankStatement[];
    let reconciliation: ReconciliationResult[];

    try {
      statements = mt940Parser.parseStatements(content);
      reconciliation = mt940Parser.reconcile(content);
    } catch (error) {
      if (error instanceof Mt940ParseError) return NextResponse.json({ error: error.message }, { status: 422 });

      throw error;
    }

    const rules = await prisma.categorizationRule.findMany({ where: { userId: user.id } });

    const transactions = statements.flatMap((statement, statementIndex) =>
      statement.transactions.map((tx) => ({
        tx,
        match: matchTransaction(tx, rules),
        statementIndex,
      })),
    );

    return NextResponse.json({ reconciliation, transactions });
  } catch (error) {
    console.error("[Import Preview] Failed to preview:", error);

    return NextResponse.json({ error: "Failed to preview import" }, { status: 500 });
  }
}
