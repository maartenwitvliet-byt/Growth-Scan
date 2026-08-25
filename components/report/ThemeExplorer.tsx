"use client";

import { useState } from "react";
import type { Statement, Theme } from "@/lib/types";

export interface ThemeExplorerData {
  theme: Theme;
  pct: number;
  statements: { statement: Statement; score: number }[];
}

export default function ThemeExplorer({ data }: { data: ThemeExplorerData[] }) {
  const [selectedId, setSelectedId] = useState(data[0]?.theme.id);
  const selected = data.find((d) => d.theme.id === selectedId) ?? data[0];

  if (!selected) return null;

  const sortedByScore = [...selected.statements].sort((a, b) => a.score - b.score);
  const minScore = sortedByScore[0]?.score ?? 0;
  const quickWins = sortedByScore.filter((s) => s.score === minScore).slice(0, 3);
  const weakest = sortedByScore.slice(0, 2);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-2">
        {data.map((d) => (
          <button
            key={d.theme.id}
            type="button"
            onClick={() => setSelectedId(d.theme.id)}
            className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
              d.theme.id === selected.theme.id
                ? "border-accent bg-accent-soft"
                : "border-ink/10 bg-white hover:border-ink/25"
            }`}
          >
            <span className="badge-square h-7 w-7 text-xs">{d.theme.id}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{d.theme.naam}</span>
              <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${Math.max(4, Math.round(d.pct))}%` }}
                />
              </span>
            </span>
            <span className="shrink-0 font-display text-sm font-semibold text-ink/60">
              {Math.round(d.pct)}%
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-lg bg-ink p-6 text-white sm:p-8">
        <div className="mb-1 flex items-center gap-3">
          <span className="badge-square bg-white text-ink">{selected.theme.id}</span>
          <h3 className="font-display text-xl font-bold sm:text-2xl">{selected.theme.naam}</h3>
        </div>
        <p className="mb-6 text-white/70">{selected.theme.intro}</p>

        <div className="mb-8">
          <h4 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-white/60">
            <span aria-hidden="true">⚡</span> Quick-wins
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {quickWins.map(({ statement }) => (
              <div key={statement.id} className="rounded-lg bg-white/10 p-4 text-sm leading-relaxed">
                {statement.richting}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-white/60">
            Duurzame oplossing
          </h4>
          <div className="space-y-3 text-sm leading-relaxed text-white/80">
            <p>{selected.theme.plek_in_fabriek}</p>
            {weakest.map(({ statement }) => (
              <p key={statement.id}>{statement.betekenis}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
