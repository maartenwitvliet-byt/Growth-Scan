import type { SupabaseClient } from "@supabase/supabase-js";
import type { Answer, Statement, Theme } from "./types";
import { SEED_REAL_SUBMISSION_THRESHOLD } from "./types";
import content from "@/db/content.json";

export interface LeakPattern {
  id: number;
  naam: string;
  herkenning: string;
  kost: string;
  herstelvolgorde: string;
}

export const LEAK_PATTERNS = content.lekpatronen as LeakPattern[];
export const PRINCIPES = content.principes as string[];

export interface ThemeScore {
  themeId: string;
  total: number;
  max: number;
  pct: number; // 0-100
}

export interface ScoreResult {
  scan1Total: number;
  scan2Total: number;
  scan1Max: number;
  scan2Max: number;
  themeScores: ThemeScore[]; // volgorde-gesorteerd, 12 stuks
}

/** Telt antwoorden op per scan en per thema (sectie 6/7). */
export function computeScores(
  answers: Pick<Answer, "statement_id" | "score">[],
  statements: Statement[],
  themes: Theme[]
): ScoreResult {
  const statementById = new Map(statements.map((s) => [s.id, s]));
  const themesSorted = [...themes].sort((a, b) => a.volgorde - b.volgorde);

  const themeTotals = new Map<string, number>();
  let scan1Total = 0;
  let scan2Total = 0;

  for (const a of answers) {
    const stmt = statementById.get(a.statement_id);
    if (!stmt) continue;
    const theme = themes.find((t) => t.id === stmt.theme_id);
    if (!theme) continue;
    themeTotals.set(theme.id, (themeTotals.get(theme.id) ?? 0) + a.score);
    if (theme.scan === "scan1") scan1Total += a.score;
    else scan2Total += a.score;
  }

  const scan1Max = themesSorted.filter((t) => t.scan === "scan1").reduce((s, t) => s + t.max_score, 0);
  const scan2Max = themesSorted.filter((t) => t.scan === "scan2").reduce((s, t) => s + t.max_score, 0);

  const themeScores: ThemeScore[] = themesSorted.map((t) => {
    const total = themeTotals.get(t.id) ?? 0;
    return { themeId: t.id, total, max: t.max_score, pct: t.max_score > 0 ? (total / t.max_score) * 100 : 0 };
  });

  return { scan1Total, scan2Total, scan1Max, scan2Max, themeScores };
}

export interface Benchmarks {
  perStatement: Record<string, { avg: number; best: number }>;
  perTheme: Record<string, { avg: number; best: number; avgPct: number; bestPct: number }>;
  submissionCount: number;
  usedSeedData: boolean;
}

/**
 * Berekent de benchmarks (gemiddelde + beste, per stelling en per thema) on-the-fly
 * over alle voltooide submissions (sectie 6). Seed-submissions tellen mee totdat er
 * genoeg echte data is (SEED_REAL_SUBMISSION_THRESHOLD, sectie 6 randgeval).
 */
export async function getBenchmarks(
  supabase: SupabaseClient,
  statements: Statement[],
  themes: Theme[]
): Promise<Benchmarks> {
  const { count: realCount, error: countErr } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed")
    .eq("is_seed", false);
  if (countErr) throw countErr;

  const useSeed = (realCount ?? 0) <= SEED_REAL_SUBMISSION_THRESHOLD;

  let subQuery = supabase.from("submissions").select("id").eq("status", "completed");
  if (!useSeed) subQuery = subQuery.eq("is_seed", false);
  const { data: qualifyingSubs, error: subErr } = await subQuery;
  if (subErr) throw subErr;
  const subIds = (qualifyingSubs ?? []).map((s) => s.id as string);

  const perStatement: Record<string, { avg: number; best: number }> = {};
  const perTheme: Record<string, { avg: number; best: number; avgPct: number; bestPct: number }> = {};

  if (subIds.length === 0) {
    return { perStatement, perTheme, submissionCount: 0, usedSeedData: useSeed };
  }

  // Answers ophalen in batches (Supabase `.in()` kan grote lijsten aan; bij zeer
  // veel submissions zou dit via een SQL view/RPC beter schalen).
  const { data: answers, error: ansErr } = await supabase
    .from("answers")
    .select("submission_id, statement_id, score")
    .in("submission_id", subIds);
  if (ansErr) throw ansErr;

  const statementById = new Map(statements.map((s) => [s.id, s]));
  const themeByStatement = new Map(statements.map((s) => [s.id, s.theme_id]));

  // Per stelling: alle scores verzamelen.
  const scoresByStatement = new Map<string, number[]>();
  for (const a of answers ?? []) {
    if (!statementById.has(a.statement_id)) continue;
    const arr = scoresByStatement.get(a.statement_id) ?? [];
    arr.push(a.score);
    scoresByStatement.set(a.statement_id, arr);
  }
  for (const [stmtId, scores] of scoresByStatement) {
    const sum = scores.reduce((a, b) => a + b, 0);
    perStatement[stmtId] = { avg: sum / scores.length, best: Math.max(...scores) };
  }

  // Per thema: eerst per submission optellen, dan avg/max over submissions.
  const themeTotalsBySubmission = new Map<string, Map<string, number>>();
  for (const a of answers ?? []) {
    const themeId = themeByStatement.get(a.statement_id);
    if (!themeId) continue;
    const bySub = themeTotalsBySubmission.get(themeId) ?? new Map<string, number>();
    bySub.set(a.submission_id, (bySub.get(a.submission_id) ?? 0) + a.score);
    themeTotalsBySubmission.set(themeId, bySub);
  }
  for (const theme of themes) {
    const bySub = themeTotalsBySubmission.get(theme.id);
    if (!bySub || bySub.size === 0) continue;
    const totals = [...bySub.values()];
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    const best = Math.max(...totals);
    perTheme[theme.id] = {
      avg,
      best,
      avgPct: theme.max_score > 0 ? (avg / theme.max_score) * 100 : 0,
      bestPct: theme.max_score > 0 ? (best / theme.max_score) * 100 : 0,
    };
  }

  return { perStatement, perTheme, submissionCount: subIds.length, usedSeedData: useSeed };
}

export interface Recommendation {
  statement: Statement;
  themeId: string;
  score: number;
}

/**
 * Kiest de 5 laagst scorende stellingen (sectie 7). Bij gelijke score:
 * voorrang aan Scan 1 boven Scan 2, en anders aan het laagste thema-nummer.
 */
export function pickRecommendations(
  answers: Pick<Answer, "statement_id" | "score">[],
  statements: Statement[],
  themes: Theme[]
): Recommendation[] {
  const statementById = new Map(statements.map((s) => [s.id, s]));
  const themeById = new Map(themes.map((t) => [t.id, t]));

  const rows: Recommendation[] = answers
    .map((a) => {
      const stmt = statementById.get(a.statement_id);
      if (!stmt) return null;
      return { statement: stmt, themeId: stmt.theme_id, score: a.score };
    })
    .filter((x): x is Recommendation => x !== null);

  rows.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    const themeA = themeById.get(a.themeId);
    const themeB = themeById.get(b.themeId);
    const scanRank = (s?: Theme) => (s?.scan === "scan1" ? 0 : 1);
    if (themeA && themeB && scanRank(themeA) !== scanRank(themeB)) return scanRank(themeA) - scanRank(themeB);
    return (themeA?.volgorde ?? 99) - (themeB?.volgorde ?? 99);
  });

  return rows.slice(0, 5);
}

/** Percentage-score per thema uit ThemeScore[], geïndexeerd op thema-id. */
function pctByTheme(themeScores: ThemeScore[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const t of themeScores) map[t.themeId] = t.pct;
  return map;
}

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

/**
 * Regel-gebaseerde herkenning van het lekpatroon dat het best bij deze
 * submission past (sectie 7). Kiest het patroon met de sterkste negatieve
 * afwijking; bij twijfel het patroon met de laagste absolute thema-scores.
 */
export function detectLeakPattern(result: ScoreResult): LeakPattern {
  const pct = pctByTheme(result.themeScores);
  const allPct = result.themeScores.map((t) => t.pct);
  const overallAvg = avg(allPct);
  const scan1Pct = result.scan1Max > 0 ? (result.scan1Total / result.scan1Max) * 100 : 0;

  const get = (id: string) => pct[id] ?? 0;

  // Patroon 1: front (1-3) laag t.o.v. de rest van de fabriek.
  const front = avg([get("1"), get("2"), get("3")]);
  const match1 = { id: 1, score: overallAvg - front, low: front };

  // Patroon 2: scan1 relatief hoog, overdracht/adoptie (7, 8) laag.
  const overdracht = avg([get("7"), get("8")]);
  const match2 = { id: 2, score: scan1Pct - overdracht, low: overdracht };

  // Patroon 3: scan1 + overdracht (7) hoog, loyaliteit/behoud/sturing (9, 10, 12) laag.
  const achterkant = Math.min(get("9"), get("10"), get("12"));
  const match3 = { id: 3, score: avg([scan1Pct, get("7")]) - achterkant, low: achterkant };

  // Patroon 4: scan1 + behoud (7-10) hoog, expansion (11) laag.
  const behoud = avg([get("7"), get("8"), get("9"), get("10")]);
  const match4 = { id: 4, score: avg([scan1Pct, behoud]) - get("11"), low: get("11") };

  const matches = [match1, match2, match3, match4];
  matches.sort((a, b) => {
    if (Math.abs(a.score - b.score) > 0.01) return b.score - a.score; // grootste afwijking eerst
    return a.low - b.low; // bij twijfel: laagste absolute thema-score
  });

  const winner = matches[0];
  return LEAK_PATTERNS.find((p) => p.id === winner.id) ?? LEAK_PATTERNS[0];
}

export interface ThemeHighlight {
  theme: Theme;
  pct: number;
}

export function highestTheme(result: ScoreResult, themes: Theme[]): ThemeHighlight {
  const sorted = [...result.themeScores].sort((a, b) => b.pct - a.pct);
  const themeById = new Map(themes.map((t) => [t.id, t]));
  return { theme: themeById.get(sorted[0].themeId)!, pct: sorted[0].pct };
}

export function lowestTheme(result: ScoreResult, themes: Theme[]): ThemeHighlight {
  const sorted = [...result.themeScores].sort((a, b) => a.pct - b.pct);
  const themeById = new Map(themes.map((t) => [t.id, t]));
  return { theme: themeById.get(sorted[0].themeId)!, pct: sorted[0].pct };
}
