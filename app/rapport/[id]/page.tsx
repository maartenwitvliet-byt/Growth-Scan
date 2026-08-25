import { notFound } from "next/navigation";
import { getServiceSupabase } from "@/lib/supabase";
import { getAllContent } from "@/lib/content";
import {
  computeScores,
  detectLeakPattern,
  getBenchmarks,
  highestTheme,
  lowestTheme,
  pickRecommendations,
} from "@/lib/scoring";
import type { Answer, Submission } from "@/lib/types";
import BenchmarkRadar, { type RadarDatum } from "@/components/report/BenchmarkRadar";
import GapBarChart, { type GapDatum } from "@/components/report/GapBarChart";
import ThemeExplorer, { type ThemeExplorerData } from "@/components/report/ThemeExplorer";
import PrintButton from "@/components/report/PrintButton";

export const dynamic = "force-dynamic";

const INDEX_NAME = process.env.NEXT_PUBLIC_INDEX_NAME || "Groei-Index";

function shortLabel(id: string, naam: string) {
  const first = naam.split(/[&,]/)[0].trim();
  return `${id}. ${first.length > 20 ? `${first.slice(0, 18)}…` : first}`;
}

export default async function ReportPage({ params }: { params: { id: string } }) {
  const supabase = getServiceSupabase();

  const { data: submission } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", params.id)
    .single<Submission>();

  if (!submission) notFound();

  const { data: answerRows } = await supabase
    .from("answers")
    .select("statement_id, score")
    .eq("submission_id", params.id);

  const answers = (answerRows ?? []) as Pick<Answer, "statement_id" | "score">[];
  const { themes, statements } = await getAllContent();

  const result = computeScores(answers, statements, themes);
  const benchmarks = await getBenchmarks(supabase, statements, themes);
  const recommendations = pickRecommendations(answers, statements, themes);
  const pattern = detectLeakPattern(result);
  const highest = highestTheme(result, themes);
  const lowest = lowestTheme(result, themes);

  const combinedTotal = result.scan1Total + result.scan2Total;
  const combinedMax = result.scan1Max + result.scan2Max;
  const indexScore = combinedMax > 0 ? Math.round((combinedTotal / combinedMax) * 100) : 0;

  const radarData: RadarDatum[] = themes
    .filter((t) => t.actief)
    .sort((a, b) => a.volgorde - b.volgorde)
    .map((t) => {
      const own = result.themeScores.find((ts) => ts.themeId === t.id);
      const bench = benchmarks.perTheme[t.id];
      return {
        themeId: t.id,
        label: shortLabel(t.id, t.naam),
        jij: own ? Math.round(own.pct) : 0,
        gemiddelde: bench ? Math.round(bench.avgPct) : 0,
        beste: bench ? Math.round(bench.bestPct) : 0,
      };
    });

  const gapData: GapDatum[] = radarData.map((d) => ({ themeId: d.themeId, label: d.label, gap: d.jij - d.gemiddelde }));

  const answerByStatement = new Map(answers.map((a) => [a.statement_id, a.score]));
  const explorerData: ThemeExplorerData[] = themes
    .filter((t) => t.actief)
    .sort((a, b) => a.volgorde - b.volgorde)
    .map((t) => {
      const own = result.themeScores.find((ts) => ts.themeId === t.id);
      const themeStatements = statements
        .filter((s) => s.theme_id === t.id && answerByStatement.has(s.id))
        .map((statement) => ({ statement, score: answerByStatement.get(statement.id)! }));
      return { theme: t, pct: own?.pct ?? 0, statements: themeStatements };
    });

  const agendaUrl = process.env.COFFEE_AGENDA_URL || "#";

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 print:px-0 print:py-4">
      {/* Hero */}
      <section className="mb-12 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-accent">
          Rapport voor {submission.company_name}
        </p>
        <h1 className="mb-6 font-display text-4xl font-bold sm:text-5xl">
          {INDEX_NAME}: {indexScore}/100
        </h1>
        <div className="mx-auto flex max-w-md justify-center gap-8 text-left">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink/50">Scan 1 — Voor de Deal</p>
            <p className="font-display text-2xl font-bold">
              {result.scan1Total}/{result.scan1Max}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-ink/50">Scan 2 — Na de Deal</p>
            <p className="font-display text-2xl font-bold">
              {result.scan2Total}/{result.scan2Max}
            </p>
          </div>
        </div>
      </section>

      {/* Key insights */}
      <section className="mb-14 grid gap-6 rounded-lg bg-accent p-8 text-white sm:grid-cols-2">
        <div>
          <h2 className="mb-3 font-display text-xl font-bold">Gefeliciteerd, je hebt de eerste stap gezet</h2>
          <p className="text-white/90">
            Je scoort het sterkst op <strong>{highest.theme.naam}</strong> ({Math.round(highest.pct)}%). De
            meeste winst zit op dit moment in <strong>{lowest.theme.naam}</strong> ({Math.round(lowest.pct)}%).
            Hieronder lees je precies waar en hoe.
          </p>
        </div>
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-2">
            <span aria-hidden="true">✓</span>
            <span>
              Sterkste thema: <strong>{highest.theme.naam}</strong>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden="true">✓</span>
            <span>
              Meeste groeipotentie: <strong>{lowest.theme.naam}</strong>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden="true">✓</span>
            <span>Neem hieronder de volledige lijst van 12 thema&apos;s door voor het complete beeld.</span>
          </li>
        </ul>
      </section>

      {/* Radar */}
      <section className="mb-14">
        <h2 className="mb-1 font-display text-2xl font-bold">Totaaloverzicht</h2>
        <p className="mb-6 text-ink/60">Jouw score tegenover het gemiddelde en de beste deelnemer, per thema.</p>
        <div className="card">
          <BenchmarkRadar data={radarData} />
        </div>
        {benchmarks.usedSeedData && (
          <p className="mt-3 text-xs text-ink/40">
            De benchmark is nog aangevuld met een kleine startset representatieve voorbeeldbedrijven,
            totdat er voldoende echte inzendingen zijn.
          </p>
        )}
      </section>

      {/* Theme explorer */}
      <section className="mb-14">
        <h2 className="mb-1 font-display text-2xl font-bold">Jouw 12 thema&apos;s</h2>
        <p className="mb-6 text-ink/60">Klik een thema aan voor quick-wins en de duurzame oplossing.</p>
        <ThemeExplorer data={explorerData} />
      </section>

      {/* Gap analysis */}
      <section className="mb-14">
        <h2 className="mb-1 font-display text-2xl font-bold">GAP-analyse</h2>
        <p className="mb-6 text-ink/60">Het verschil tussen jouw score en het gemiddelde, per thema.</p>
        <div className="card">
          <GapBarChart data={gapData} />
        </div>
      </section>

      {/* Recommendations */}
      <section className="mb-14">
        <h2 className="mb-1 font-display text-2xl font-bold">5 aanbevelingen</h2>
        <div className="mb-6 rounded-lg bg-panel p-5">
          <p className="mb-1 font-display font-semibold">{pattern.naam}</p>
          <p className="text-sm text-ink/70">{pattern.herkenning}</p>
          <p className="mt-2 text-sm text-ink/70">{pattern.herstelvolgorde}</p>
        </div>
        <ol className="space-y-4">
          {recommendations.map((rec, i) => (
            <li key={rec.statement.id} className="card flex gap-4">
              <span className="badge-square shrink-0">{i + 1}</span>
              <div>
                <p className="mb-1 text-sm text-ink/50">
                  Stelling {rec.statement.id} · jouw score: <strong>{rec.score}/5</strong>
                </p>
                <p className="mb-2 font-display font-semibold">{rec.statement.tekst}</p>
                <p className="text-sm text-ink/70">{rec.statement.richting}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* CTA */}
      <section className="rounded-lg border border-ink/10 bg-panel p-8 text-center print:hidden">
        <h2 className="mb-2 font-display text-2xl font-bold">Deze uitkomst verdient een gesprek</h2>
        <p className="mb-6 text-ink/70">Plan een kop koffie om je resultaat en de kansen door te nemen.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <a href={agendaUrl} className="btn-primary">
            Plan een kop koffie
          </a>
          <PrintButton />
        </div>
      </section>
    </main>
  );
}
