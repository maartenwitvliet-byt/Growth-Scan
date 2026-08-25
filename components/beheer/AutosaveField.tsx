"use client";

import { useEffect, useRef, useState } from "react";

type Status = "idle" | "saving" | "saved" | "error";

/** Klein "opgeslagen"-indicatortje in Notion/Typeform-stijl (sectie 5). */
export function SaveIndicator({ status }: { status: Status }) {
  if (status === "idle") return null;
  return (
    <span
      className={`ml-2 text-xs ${
        status === "saving" ? "text-ink/40" : status === "saved" ? "text-emerald-600" : "text-accent"
      }`}
    >
      {status === "saving" ? "Opslaan..." : status === "saved" ? "Opgeslagen" : "Mislukt"}
    </span>
  );
}

/** Autosave-hook: slaat op bij blur (tekstvelden) of direct (toggles/selects). */
export function useAutosave<T extends object>(save: (patch: Partial<T>) => Promise<void>) {
  const [status, setStatus] = useState<Status>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const commit = async (patch: Partial<T>) => {
    setStatus("saving");
    try {
      await save(patch);
      setStatus("saved");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("error");
    }
  };

  return { status, commit };
}
