import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

const EDITABLE_FIELDS = [
  "tekst",
  "score_1_2",
  "score_4_5",
  "betekenis",
  "richting",
  "actief",
  "volgorde",
  "theme_id",
] as const;

/** PATCH: autosave per veld, en ook het verplaatsen naar een ander thema (theme_id). */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Ongeldige body." }, { status: 400 });

  const update: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) update[field] = body[field];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Geen bewerkbare velden meegegeven." }, { status: 400 });
  }
  update.updated_at = new Date().toISOString();

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("statements")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
