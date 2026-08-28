/**
 * Eenmalig seed-script (sectie 4 van de bouwprompt).
 *
 * - Vult `themes` en `statements` vanuit db/content.json. Na deze eerste seed
 *   is de database leidend — wijzigingen gebeuren via de content-editor
 *   (/beheer), niet door dit script opnieuw te draaien met andere content.
 *   Opnieuw draaien is wel veilig: het is een upsert op de stabiele id's.
 * - Zaait 8 synthetische, duidelijk gemarkeerde (`is_seed = true`) submissions
 *   zodat de eerste échte deelnemers nooit een lege of triviale benchmark
 *   zien (randgeval, sectie 6). Dit gebeurt maar één keer: als er al
 *   seed-submissions bestaan, wordt dit deel overgeslagen.
 *
 * Gebruik: npm run seed  (vereist SUPABASE_SERVICE_ROLE_KEY in .env.local)
 */
import { config } from "dotenv";
// Next.js leest zelf .env.local; dit losstaande script (buiten Next om) moet
// dat expliciet doen — anders vindt het alleen een eventueel kaal .env-bestand.
config({ path: ".env.local" });
config(); // vult eventueel aan met .env, zonder al gezette waarden te overschrijven
import { createClient } from "@supabase/supabase-js";
import content from "./content.json";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Ontbrekende env vars: NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY zijn verplicht om te seeden."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

// Kleine deterministische RNG zodat herhaalde runs dezelfde synthetische data geven.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type SeedProfile = { naam: string; bedrijf: string; sector: string; laag: number; hoog: number };

// Anchors uit sectie 16-17: "gemiddeld bedrijf" scoort wisselend (rond het midden),
// een "best presterend bedrijf" scoort uitstekend ontwikkeld (4-5) op vrijwel alles.
const profielen: SeedProfile[] = [
  { naam: "Gemiddeld bedrijf A", bedrijf: "Voorbeeld Groep BV", sector: "Zakelijke dienstverlening", laag: 2, hoog: 4 },
  { naam: "Gemiddeld bedrijf B", bedrijf: "Noordkaap Software", sector: "SaaS", laag: 2, hoog: 3 },
  { naam: "Gemiddeld bedrijf C", bedrijf: "De Verbinding Consultancy", sector: "Consultancy", laag: 2, hoog: 4 },
  { naam: "Gemiddeld bedrijf D", bedrijf: "Rivierstad Retail", sector: "Retail", laag: 1, hoog: 4 },
  { naam: "Gemiddeld bedrijf E", bedrijf: "Kompas Financieel", sector: "Financiële diensten", laag: 2, hoog: 3 },
  { naam: "Best presterend bedrijf A", bedrijf: "Vaandel Groeibedrijf", sector: "SaaS", laag: 4, hoog: 5 },
  { naam: "Best presterend bedrijf B", bedrijf: "Hoogland Industrie", sector: "Industrie & productie", laag: 4, hoog: 5 },
  { naam: "Best presterend bedrijf C", bedrijf: "Scherpzicht Bureau", sector: "Marketing & reclame", laag: 3, hoog: 5 },
];

const scanByTheme = new Map(content.themes.map((t) => [t.id, t.scan]));
const scanByStatement = new Map(content.statements.map((s) => [s.id, scanByTheme.get(s.theme_id)]));

async function main() {
  console.log(`Upserting ${content.themes.length} thema's...`);
  const { error: themeErr } = await supabase.from("themes").upsert(content.themes, { onConflict: "id" });
  if (themeErr) throw themeErr;

  console.log(`Upserting ${content.statements.length} stellingen...`);
  const { error: stmtErr } = await supabase.from("statements").upsert(content.statements, { onConflict: "id" });
  if (stmtErr) throw stmtErr;

  const { count, error: countErr } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("is_seed", true);
  if (countErr) throw countErr;

  if (count && count > 0) {
    console.log(`Er bestaan al ${count} seed-submissions — sla synthetische data over.`);
  } else {
    console.log("Seed-submissions aanmaken voor een betekenisvolle startbenchmark...");
    const rng = mulberry32(42);
    for (const profiel of profielen) {
      const { data: submission, error: subErr } = await supabase
        .from("submissions")
        .insert({
          company_name: profiel.bedrijf,
          contact_name: profiel.naam,
          email: "seed@intern.local",
          phone: "000000000",
          sector: profiel.sector,
          consent_marketing: false,
          status: "completed",
          is_seed: true,
        })
        .select("id")
        .single();
      if (subErr) throw subErr;

      const answers = content.statements.map((s) => {
        const span = profiel.hoog - profiel.laag;
        const score = Math.round(profiel.laag + rng() * span);
        return {
          submission_id: submission.id,
          statement_id: s.id,
          score: Math.min(5, Math.max(1, score)),
        };
      });

      const { error: ansErr } = await supabase.from("answers").insert(answers);
      if (ansErr) throw ansErr;

      const scan1Total = answers
        .filter((a) => scanByStatement.get(a.statement_id) === "scan1")
        .reduce((sum, a) => sum + a.score, 0);
      const scan2Total = answers.reduce((sum, a) => sum + a.score, 0) - scan1Total;

      await supabase
        .from("submissions")
        .update({ scan1_total: scan1Total, scan2_total: scan2Total })
        .eq("id", submission.id);

      console.log(`  + ${profiel.bedrijf} (${answers.length} antwoorden)`);
    }
  }

  console.log("Klaar.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
