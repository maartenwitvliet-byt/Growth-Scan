"use client";

import { useState } from "react";
import type { Statement } from "@/lib/types";

interface Props {
  statement: Statement;
  themeId: string;
  themeNaam: string;
  selected: number | undefined;
  onSelect: (score: number) => void;
  onConfirm: () => void;
  positionLabel: string; // bv. "Stelling 5 van 46"
}

const LABELS: Record<number, string> = {
  1: "Onvoldoende ontwikkeld",
  3: "Wisselend",
  5: "Uitstekend ontwikkeld",
};

export default function StatementScreen({
  statement,
  themeId,
  themeNaam,
  selected,
  onSelect,
  onConfirm,
  positionLabel,
}: Props) {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl animate-slide-up motion-reduce:animate-none">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink/50">
            <span className="badge-square h-6 w-6 text-xs">{themeId}</span>
            {themeNaam}
          </div>
          <span className="text-xs text-ink/40">{positionLabel}</span>
        </div>

        <div className="mb-8 flex items-start gap-2">
          <h2 className="font-display text-2xl font-bold leading-snug sm:text-3xl">{statement.tekst}</h2>
          <button
            type="button"
            aria-label="Meer uitleg over deze stelling"
            aria-expanded={infoOpen}
            onClick={() => setInfoOpen((v) => !v)}
            className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ink/20 text-xs font-bold text-ink/50 transition hover:border-accent hover:text-accent"
          >
            i
          </button>
        </div>

        {infoOpen && (
          <div className="mb-8 grid gap-4 rounded-lg border border-ink/10 bg-panel p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="mb-1 font-display font-semibold text-ink/70">Score 1–2</p>
              <p className="text-ink/70">{statement.score_1_2}</p>
            </div>
            <div>
              <p className="mb-1 font-display font-semibold text-ink/70">Score 4–5</p>
              <p className="text-ink/70">{statement.score_4_5}</p>
            </div>
          </div>
        )}

        <div className="mb-4 grid grid-cols-5 gap-2 sm:gap-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onSelect(n)}
              aria-pressed={selected === n}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg border-2 font-display text-xl font-bold transition ${
                selected === n
                  ? "border-accent bg-accent text-white"
                  : "border-ink/15 bg-white text-ink hover:border-accent/50"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="mb-10 grid grid-cols-5 gap-2 text-center text-[11px] leading-tight text-ink/50 sm:text-xs">
          <span>{LABELS[1]}</span>
          <span />
          <span>{LABELS[3]}</span>
          <span />
          <span>{LABELS[5]}</span>
        </div>

        <button type="button" onClick={onConfirm} disabled={!selected} className="btn-primary">
          OK
        </button>
        <p className="mt-3 text-xs text-ink/40">
          Tip: gebruik de cijfertoetsen 1–5 om te kiezen, Enter om te bevestigen.
        </p>
      </div>
    </div>
  );
}
