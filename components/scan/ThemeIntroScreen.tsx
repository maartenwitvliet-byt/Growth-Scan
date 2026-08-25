import type { ThemeWithStatements } from "@/lib/types";

interface Props {
  theme: ThemeWithStatements;
  progressPct: number;
  onContinue: () => void;
}

export default function ThemeIntroScreen({ theme, progressPct, onContinue }: Props) {
  const count = theme.statements.length;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl animate-slide-up motion-reduce:animate-none text-center">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="badge-square text-base">{theme.id}</span>
          <h2 className="font-display text-2xl font-bold sm:text-3xl">{theme.naam}</h2>
        </div>

        <p className="mb-8 text-lg leading-relaxed text-ink/70">{theme.intro}</p>

        <div className="mb-10">
          <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-panel">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-sm text-ink/60">
            Goed bezig, je hebt al <strong>{progressPct}%</strong> van de stellingen gehad. Hierna
            volgen {count} {count === 1 ? "stelling" : "stellingen"} over {theme.naam.toLowerCase()}.
          </p>
        </div>

        <button type="button" onClick={onContinue} className="btn-primary">
          Doorgaan
        </button>
      </div>
    </div>
  );
}
