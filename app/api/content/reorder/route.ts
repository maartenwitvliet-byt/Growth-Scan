import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

/**
 * POST: bulk-reorder na drag-to-reorder in de content-editor (sectie 5).
 * body: { kind: 'theme' | 'statement', items: { id: string; volgorde: number }[] }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || (body.kind !== "theme" && body.kind !== "statement") || !Array.isArray(body.items)) {
    return NextResponse.json({ error: "Ongeldige body." }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const table = body.kind === "theme" ? "themes" : "statements";

  const results = await Promise.all(
    (body.items as { id: string; volgorde: number }[]).map(({ id, volgorde }) =>
      supabase.from(table).update({ volgorde }).eq("id", id)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
