import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

const EDITABLE_FIELDS = ["naam", "intro", "plek_in_fabriek", "actief", "volgorde", "max_score"] as const;

/**
 * PATCH: autosave per veld vanuit de content-editor (sectie 5). "actief: false"
 * is een archivering — bestaande antwoorden/benchmarks blijven intact, de
 * stelling/thema verdwijnt alleen uit de live scan voor nieuwe bezoekers.
 */
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

  const supabase = getServiceSupabase();
  const { data, error } = await supabase.from("themes").update(update).eq("id", params.id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
