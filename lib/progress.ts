export const PROGRESS_KEY = "rgs_progress_v1";

export interface ScanProgress {
  answers: Record<string, number>;
  stepIndex: number;
  updatedAt: number;
}

export function loadProgress(): ScanProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || typeof parsed.answers !== "object") return null;
    return parsed as ScanProgress;
  } catch {
    return null;
  }
}

export function saveProgress(progress: ScanProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // localStorage kan vol of geblokkeerd zijn — de scan werkt dan gewoon
    // door zonder autosave, geen harde fout voor de gebruiker.
  }
}

export function clearProgress(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PROGRESS_KEY);
  } catch {
    /* noop */
  }
}
