"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Statement, Theme } from "@/lib/types";
import { ThemeEditPanel, StatementEditPanel } from "./EditPanel";

type Selection = { kind: "theme"; id: string } | { kind: "statement"; id: string } | null;

export default function ContentEditor({
  initialThemes,
  initialStatements,
}: {
  initialThemes: Theme[];
  initialStatements: Statement[];
}) {
  const router = useRouter();
  const [themes, setThemes] = useState<Theme[]>(initialThemes);
  const [statements, setStatements] = useState<Statement[]>(initialStatements);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selection, setSelection] = useState<Selection>(null);
  const [newThemeOpen, setNewThemeOpen] = useState(false);
  const [newStatementFor, setNewStatementFor] = useState<string | null>(null);
  const [dragThemeId, setDragThemeId] = useState<string | null>(null);
  const [dragStatementId, setDragStatementId] = useState<string | null>(null);

  const themesSorted = useMemo(() => [...themes].sort((a, b) => a.volgorde - b.volgorde), [themes]);
  const statementsByTheme = useMemo(() => {
    const map = new Map<string, Statement[]>();
    for (const s of statements) {
      const arr = map.get(s.theme_id) ?? [];
      arr.push(s);
      map.set(s.theme_id, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.volgorde - b.volgorde);
    return map;
  }, [statements]);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function reorderThemes(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    const order = [...themesSorted];
    const from = order.findIndex((t) => t.id === draggedId);
    const to = order.findIndex((t) => t.id === targetId);
    if (from === -1 || to === -1) return;
    const [moved] = order.splice(from, 1);
    order.splice(to, 0, moved);
    const items = order.map((t, i) => ({ id: t.id, volgorde: i + 1 }));
    setThemes((prev) => prev.map((t) => ({ ...t, volgorde: items.find((i) => i.id === t.id)?.volgorde ?? t.volgorde })));
    await fetch("/api/content/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "theme", items }),
    });
  }

  async function reorderStatements(themeId: string, draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    const list = [...(statementsByTheme.get(themeId) ?? [])];
    const from = list.findIndex((s) => s.id === draggedId);
    const to = list.findIndex((s) => s.id === targetId);
    if (from === -1 || to === -1) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    const items = list.map((s, i) => ({ id: s.id, volgorde: i + 1 }));
    setStatements((prev) =>
      prev.map((s) => (s.theme_id === themeId ? { ...s, volgorde: items.find((i) => i.id === s.id)?.volgorde ?? s.volgorde } : s))
    );
    await fetch("/api/content/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "statement", items }),
    });
  }

  async function logout() {
    await fetch("/api/beheer/logout", { method: "POST" });
    router.push("/beheer/login");
    router.refresh();
  }

  const selectedTheme = selection?.kind === "theme" ? themes.find((t) => t.id === selection.id) : undefined;
  const selectedStatement = selection?.kind === "statement" ? statements.find((s) => s.id === selection.id) : undefined;

  return (
    <div className="min-h-screen bg-panel">
      <header className="flex items-center justify-between border-b border-ink/10 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="badge-square">RGS</span>
          <span className="font-display text-sm font-semibold uppercase tracking-wide text-ink/60">
            Content-editor
          </span>
        </div>
        <button type="button" onClick={logout} className="btn-secondary !px-4 !py-2 text-xs">
          Uitloggen
        </button>
      </header>

      <div className="grid gap-6 p-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-2">
          {themesSorted.map((theme) => (
            <div
              key={theme.id}
              draggable
              onDragStart={() => setDragThemeId(theme.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => dragThemeId && reorderThemes(dragThemeId, theme.id)}
              className={`rounded-lg border bg-white ${!theme.actief ? "opacity-50" : ""} ${
                selection?.kind === "theme" && selection.id === theme.id ? "border-accent" : "border-ink/10"
              }`}
            >
              <div className="flex items-center gap-2 p-3">
                <span className="cursor-grab text-ink/30" aria-hidden="true">
                  ⠿
                </span>
                <button
                  type="button"
                  onClick={() => toggleExpanded(theme.id)}
                  className="text-ink/40"
                  aria-label={expanded.has(theme.id) ? "Inklappen" : "Uitklappen"}
                >
                  {expanded.has(theme.id) ? "▾" : "▸"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelection({ kind: "theme", id: theme.id })}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <span className="badge-square h-6 w-6 text-xs">{theme.id}</span>
                  <span className="truncate text-sm font-medium">{theme.naam}</span>
                </button>
              </div>

              {expanded.has(theme.id) && (
                <div className="space-y-1 border-t border-ink/10 p-2 pl-8">
                  {(statementsByTheme.get(theme.id) ?? []).map((s) => (
                    <div
                      key={s.id}
                      draggable
                      onDragStart={() => setDragStatementId(s.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => dragStatementId && reorderStatements(theme.id, dragStatementId, s.id)}
                      className={`flex items-center gap-2 rounded p-2 text-sm ${!s.actief ? "opacity-50" : ""} ${
                        selection?.kind === "statement" && selection.id === s.id ? "bg-accent-soft" : "hover:bg-panel"
                      }`}
                    >
                      <span className="cursor-grab text-ink/30" aria-hidden="true">
                        ⠿
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelection({ kind: "statement", id: s.id })}
                        className="flex-1 truncate text-left"
                      >
                        <span className="mr-1.5 text-ink/40">{s.id}</span>
                        {s.tekst}
                      </button>
                    </div>
                  ))}
                  {newStatementFor === theme.id ? (
                    <NewStatementForm
                      themeId={theme.id}
                      onDone={(s) => {
                        setStatements((prev) => [...prev, s]);
                        setNewStatementFor(null);
                        setSelection({ kind: "statement", id: s.id });
                      }}
                      onCancel={() => setNewStatementFor(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setNewStatementFor(theme.id)}
                      className="w-full rounded p-2 text-left text-xs font-medium text-accent hover:bg-accent-soft"
                    >
                      + Nieuwe stelling
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {newThemeOpen ? (
            <NewThemeForm
              onDone={(t) => {
                setThemes((prev) => [...prev, t]);
                setNewThemeOpen(false);
                setSelection({ kind: "theme", id: t.id });
              }}
              onCancel={() => setNewThemeOpen(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setNewThemeOpen(true)}
              className="w-full rounded-lg border border-dashed border-ink/20 p-3 text-sm font-medium text-accent hover:bg-white"
            >
              + Nieuw thema
            </button>
          )}
        </div>

        <div className="card">
          {selectedTheme && (
            <ThemeEditPanel
              theme={selectedTheme}
              onSaved={(updated) => setThemes((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))}
            />
          )}
          {selectedStatement && (
            <StatementEditPanel
              statement={selectedStatement}
              themes={themesSorted}
              onSaved={(updated) => setStatements((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))}
            />
          )}
          {!selectedTheme && !selectedStatement && (
            <p className="text-sm text-ink/50">Selecteer een thema of stelling om te bewerken.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function NewThemeForm({ onDone, onCancel }: { onDone: (t: Theme) => void; onCancel: () => void }) {
  const [id, setId] = useState("");
  const [naam, setNaam] = useState("");
  const [scan, setScan] = useState<"scan1" | "scan2">("scan1");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const res = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "theme", id, naam, scan }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Aanmaken mislukt.");
    onDone(data);
  };

  return (
    <div className="space-y-2 rounded-lg border border-ink/10 bg-white p-3">
      <input className="input" placeholder="Thema-id (bv. 13)" value={id} onChange={(e) => setId(e.target.value)} />
      <input className="input" placeholder="Naam" value={naam} onChange={(e) => setNaam(e.target.value)} />
      <select className="input" value={scan} onChange={(e) => setScan(e.target.value as "scan1" | "scan2")}>
        <option value="scan1">Scan 1 — Voor de Deal</option>
        <option value="scan2">Scan 2 — Na de Deal</option>
      </select>
      {error && <p className="text-xs text-accent">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={submit} className="btn-primary !px-4 !py-2 text-xs">
          Aanmaken
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary !px-4 !py-2 text-xs">
          Annuleren
        </button>
      </div>
    </div>
  );
}

function NewStatementForm({
  themeId,
  onDone,
  onCancel,
}: {
  themeId: string;
  onDone: (s: Statement) => void;
  onCancel: () => void;
}) {
  const [id, setId] = useState("");
  const [tekst, setTekst] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const res = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "statement", id, tekst, theme_id: themeId }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Aanmaken mislukt.");
    onDone(data);
  };

  return (
    <div className="space-y-2 rounded-lg border border-ink/10 bg-white p-3">
      <input className="input" placeholder={`Stelling-id (bv. ${themeId}.5)`} value={id} onChange={(e) => setId(e.target.value)} />
      <input className="input" placeholder="Stellingtekst" value={tekst} onChange={(e) => setTekst(e.target.value)} />
      {error && <p className="text-xs text-accent">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={submit} className="btn-primary !px-4 !py-2 text-xs">
          Aanmaken
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary !px-4 !py-2 text-xs">
          Annuleren
        </button>
      </div>
    </div>
  );
}
