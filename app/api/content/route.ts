import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getAllContent } from "@/lib/content";

/** GET: alle thema's + stellingen (incl. inactieve) voor de content-editor. */
export async function GET() {
  const { themes, statements } = await getAllContent();
  return NextResponse.json({ themes, statements });
}

/**
 * POST: nieuw thema of nieuwe stelling aanmaken (sectie 5, "+ Nieuw thema" /
 * "+ Nieuwe stelling"). body.kind bepaalt welke.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || (body.kind !== "theme" && body.kind !== "statement")) {
    return NextResponse.json({ error: "kind moet 'theme' of 'statement' zijn." }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  if (body.kind === "theme") {
    const { id, scan } = body;
    if (!id || typeof id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: "Ongeldig of ontbrekend thema-id." }, { status: 400 });
    }
    if (scan !== "scan1" && scan !== "scan2") {
      return NextResponse.json({ error: "scan moet 'scan1' of 'scan2' zijn." }, { status: 400 });
    }
    const { count } = await supabase.from("themes").select("id", { count: "exact", head: true }).eq("id", id);
    if (count && count > 0) {
      return NextResponse.json({ error: `Thema-id '${id}' bestaat al.` }, { status: 409 });
    }
    const { count: maxVolgordeCount } = await supabase
      .from("themes")
      .select("id", { count: "exact", head: true });
    const { data, error } = await supabase
      .from("themes")
      .insert({
        id,
        scan,
        volgorde: (maxVolgordeCount ?? 0) + 1,
        naam: body.naam || "Nieuw thema",
        intro: body.intro || "",
        plek_in_fabriek: body.plek_in_fabriek || "",
        max_score: body.max_score || 20,
        actief: true,
      })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { id, theme_id } = body;
  if (!id || typeof id !== "string" || !/^[a-zA-Z0-9_.-]+$/.test(id)) {
    return NextResponse.json({ error: "Ongeldig of ontbrekend stelling-id." }, { status: 400 });
  }
  if (!theme_id) {
    return NextResponse.json({ error: "theme_id is verplicht." }, { status: 400 });
  }
  const { count } = await supabase.from("statements").select("id", { count: "exact", head: true }).eq("id", id);
  if (count && count > 0) {
    return NextResponse.json({ error: `Stelling-id '${id}' bestaat al.` }, { status: 409 });
  }
  const { count: siblingCount } = await supabase
    .from("statements")
    .select("id", { count: "exact", head: true })
    .eq("theme_id", theme_id);
  const { data, error } = await supabase
    .from("statements")
    .insert({
      id,
      theme_id,
      volgorde: (siblingCount ?? 0) + 1,
      tekst: body.tekst || "Nieuwe stelling",
      score_1_2: body.score_1_2 || "",
      score_4_5: body.score_4_5 || "",
      betekenis: body.betekenis || "",
      richting: body.richting || "",
      actief: true,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
