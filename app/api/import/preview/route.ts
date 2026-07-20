import { NextResponse } from "next/server";
import type { CategorizationRule } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mt940Parser, Mt940ParseError } from "@/lib/import/mt940-parser";
import { matchTransaction, type MatchCandidate, type MatchResult } from "@/lib/categorize/match";
import type { BankStatement, ReconciliationResult } from "@/lib/import/types";

/** A pointered series' live coordinates — where entries will actually land. */
interface EffectiveDestination {
  seriesId: string;
  name: string;
  categoryId: string;
}

/**
 * A match candidate as the preview serves it: the concrete `ruleId` (fates
 * echo it back so confirmations bump by id — never fork by identity) and the
 * resolved `destination` (the pointered series' CURRENT name/category, which
 * the UI must display instead of the rule's possibly-stale category; `null`
 * when the rule has no surviving pointer).
 */
interface PreviewCandidate extends MatchCandidate {
  ruleId: string;
  destination: EffectiveDestination | null;
}

type PreviewMatch =
  | { tier: "confident"; candidate: PreviewCandidate }
  | { tier: "suggested"; candidates: PreviewCandidate[] }
  | { tier: "unknown" };

/** The `budgetSeries` projection the destination lookup selects. */
interface PointedSeries {
  id: string;
  name: string;
  categoryId: string;
}

/** The candidates a match result carries, tier-agnostic. */
function candidatesOf(match: MatchResult): MatchCandidate[] {

  if (match.tier === "confident") return [match.candidate];

  if (match.tier === "suggested") return match.candidates;

  return [];
}

/**
 * Attaches ruleId + resolved destination to one candidate. The stored row is
 * looked up by id because the matcher types rules structurally — the pointer
 * (`seriesId`) only exists on the Prisma row.
 */
function enrichCandidate(
  candidate: MatchCandidate,
  ruleById: Map<string, CategorizationRule>,
  seriesById: Map<string, PointedSeries>,
): PreviewCandidate {

  const stored = ruleById.get(candidate.rule.id);
  const series = stored !== undefined && stored.seriesId !== null ? seriesById.get(stored.seriesId) : undefined;

  return {
    ...candidate,
    ruleId: candidate.rule.id,
    destination: series === undefined ? null : { seriesId: series.id, name: series.name, categoryId: series.categoryId },
  };
}

function enrichMatch(
  match: MatchResult,
  ruleById: Map<string, CategorizationRule>,
  seriesById: Map<string, PointedSeries>,
): PreviewMatch {

  if (match.tier === "confident") return { tier: "confident", candidate: enrichCandidate(match.candidate, ruleById, seriesById) };

  if (match.tier === "suggested") return { tier: "suggested", candidates: match.candidates.map((candidate) => enrichCandidate(candidate, ruleById, seriesById)) };

  return match;
}

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
    const ruleById = new Map(rules.map((rule) => [rule.id, rule]));

    const matched = statements.flatMap((statement, statementIndex) =>
      statement.transactions.map((tx) => ({
        tx,
        match: matchTransaction(tx, rules),
        statementIndex,
      })),
    );

    // One batched load of every pointered candidate's series (never per
    // candidate): the review UI must display the card's LIVE name/category —
    // the rule's stored category may be stale (pointer wins).
    const pointedSeriesIds = [
      ...new Set(
        matched.flatMap(({ match }) =>
          candidatesOf(match).flatMap((candidate) => {
            const stored = ruleById.get(candidate.rule.id);

            return stored !== undefined && stored.seriesId !== null ? [stored.seriesId] : [];
          }),
        ),
      ),
    ];

    const pointedSeries: PointedSeries[] = pointedSeriesIds.length > 0
      ? await prisma.budgetSeries.findMany({
          where: { id: { in: pointedSeriesIds }, userId: user.id },
          select: { id: true, name: true, categoryId: true },
        })
      : [];

    const seriesById = new Map(pointedSeries.map((series) => [series.id, series]));

    const transactions = matched.map((entry) => ({ ...entry, match: enrichMatch(entry.match, ruleById, seriesById) }));

    return NextResponse.json({ reconciliation, transactions });
  } catch (error) {
    console.error("[Import Preview] Failed to preview:", error);

    return NextResponse.json({ error: "Failed to preview import" }, { status: 500 });
  }
}
