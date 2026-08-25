import { getServiceSupabase } from "./supabase";
import type { Statement, Theme, ThemeWithStatements } from "./types";

/** Alle actieve thema's + stellingen, gesorteerd — voor de live scan. */
export async function getActiveContent(): Promise<ThemeWithStatements[]> {
  const supabase = getServiceSupabase();
  const [{ data: themes, error: themeErr }, { data: statements, error: stmtErr }] = await Promise.all([
    supabase.from("themes").select("*").eq("actief", true).order("volgorde", { ascending: true }),
    supabase.from("statements").select("*").eq("actief", true).order("volgorde", { ascending: true }),
  ]);
  if (themeErr) throw themeErr;
  if (stmtErr) throw stmtErr;

  const byTheme = new Map<string, Statement[]>();
  for (const s of (statements ?? []) as Statement[]) {
    const arr = byTheme.get(s.theme_id) ?? [];
    arr.push(s);
    byTheme.set(s.theme_id, arr);
  }

  return ((themes ?? []) as Theme[]).map((t) => ({ ...t, statements: byTheme.get(t.id) ?? [] }));
}

/** Alle thema's/stellingen inclusief inactieve — voor scoring/rapportage, waar
 * historische antwoorden op gearchiveerde stellingen nog moeten kloppen. */
export async function getAllContent(): Promise<{ themes: Theme[]; statements: Statement[] }> {
  const supabase = getServiceSupabase();
  const [{ data: themes, error: themeErr }, { data: statements, error: stmtErr }] = await Promise.all([
    supabase.from("themes").select("*").order("volgorde", { ascending: true }),
    supabase.from("statements").select("*").order("volgorde", { ascending: true }),
  ]);
  if (themeErr) throw themeErr;
  if (stmtErr) throw stmtErr;
  return { themes: (themes ?? []) as Theme[], statements: (statements ?? []) as Statement[] };
}
