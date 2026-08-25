"use client";

import { useState } from "react";
import type { Statement, Theme } from "@/lib/types";
import { SaveIndicator, useAutosave } from "./AutosaveField";

export function ThemeEditPanel({
  theme,
  onSaved,
}: {
  theme: Theme;
  onSaved: (updated: Theme) => void;
}) {
  const [local, setLocal] = useState(theme);
  const { status, commit } = useAutosave<Theme>(async (patch) => {
    const res = await fetch(`/api/content/themes/${theme.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error("save failed");
    const updated = await res.json();
    onSaved(updated);
  });

  return (
    <div key={theme.id} className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">
          Thema {theme.id} <SaveIndicator status={status} />
        </h3>
        <label className="flex items-center gap-2 text-sm">
          Actief
          <input
            type="checkbox"
            checked={local.actief}
            onChange={(e) => {
              const actief = e.target.checked;
              setLocal((l) => ({ ...l, actief }));
              void commit({ actief });
            }}
            className="h-4 w-4"
          />
        </label>
      </div>

      <FieldRow label="Naam">
        <input
          className="input"
          value={local.naam}
          onChange={(e) => setLocal((l) => ({ ...l, naam: e.target.value }))}
          onBlur={() => commit({ naam: local.naam })}
        />
      </FieldRow>

      <FieldRow label="Introtekst">
        <textarea
          className="input min-h-[80px]"
          value={local.intro}
          onChange={(e) => setLocal((l) => ({ ...l, intro: e.target.value }))}
          onBlur={() => commit({ intro: local.intro })}
        />
      </FieldRow>

      <FieldRow label="Plek in de fabriek">
        <textarea
          className="input min-h-[100px]"
          value={local.plek_in_fabriek}
          onChange={(e) => setLocal((l) => ({ ...l, plek_in_fabriek: e.target.value }))}
          onBlur={() => commit({ plek_in_fabriek: local.plek_in_fabriek })}
        />
      </FieldRow>

      <FieldRow label="Maximale score">
        <input
          type="number"
          className="input"
          value={local.max_score}
          onChange={(e) => setLocal((l) => ({ ...l, max_score: Number(e.target.value) }))}
          onBlur={() => commit({ max_score: local.max_score })}
        />
      </FieldRow>
    </div>
  );
}

export function StatementEditPanel({
  statement,
  themes,
  onSaved,
}: {
  statement: Statement;
  themes: Theme[];
  onSaved: (updated: Statement) => void;
}) {
  const [local, setLocal] = useState(statement);
  const { status, commit } = useAutosave<Statement>(async (patch) => {
    const res = await fetch(`/api/content/statements/${statement.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error("save failed");
    const updated = await res.json();
    onSaved(updated);
  });

  return (
    <div key={statement.id} className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">
          Stelling {statement.id} <SaveIndicator status={status} />
        </h3>
        <label className="flex items-center gap-2 text-sm">
          Actief
          <input
            type="checkbox"
            checked={local.actief}
            onChange={(e) => {
              const actief = e.target.checked;
              setLocal((l) => ({ ...l, actief }));
              void commit({ actief });
            }}
            className="h-4 w-4"
          />
        </label>
      </div>

      <FieldRow label="Thema">
        <select
          className="input"
          value={local.theme_id}
          onChange={(e) => {
            const theme_id = e.target.value;
            setLocal((l) => ({ ...l, theme_id }));
            void commit({ theme_id });
          }}
        >
          {themes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.id} — {t.naam}
            </option>
          ))}
        </select>
      </FieldRow>

      <FieldRow label="Stellingtekst">
        <textarea
          className="input min-h-[70px]"
          value={local.tekst}
          onChange={(e) => setLocal((l) => ({ ...l, tekst: e.target.value }))}
          onBlur={() => commit({ tekst: local.tekst })}
        />
      </FieldRow>

      <FieldRow label="Score 1–2 omschrijving">
        <textarea
          className="input min-h-[90px]"
          value={local.score_1_2}
          onChange={(e) => setLocal((l) => ({ ...l, score_1_2: e.target.value }))}
          onBlur={() => commit({ score_1_2: local.score_1_2 })}
        />
      </FieldRow>

      <FieldRow label="Score 4–5 omschrijving">
        <textarea
          className="input min-h-[90px]"
          value={local.score_4_5}
          onChange={(e) => setLocal((l) => ({ ...l, score_4_5: e.target.value }))}
          onBlur={() => commit({ score_4_5: local.score_4_5 })}
        />
      </FieldRow>

      <FieldRow label="Wat betekent een lage score">
        <textarea
          className="input min-h-[90px]"
          value={local.betekenis}
          onChange={(e) => setLocal((l) => ({ ...l, betekenis: e.target.value }))}
          onBlur={() => commit({ betekenis: local.betekenis })}
        />
      </FieldRow>

      <FieldRow label="Verbeterrichting">
        <textarea
          className="input min-h-[90px]"
          value={local.richting}
          onChange={(e) => setLocal((l) => ({ ...l, richting: e.target.value }))}
          onBlur={() => commit({ richting: local.richting })}
        />
      </FieldRow>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink/70">{label}</span>
      {children}
    </label>
  );
}
