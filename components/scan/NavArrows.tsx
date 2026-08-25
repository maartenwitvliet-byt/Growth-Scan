"use client";

interface Props {
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}

export default function NavArrows({ onPrev, onNext, canPrev, canNext }: Props) {
  return (
    <div className="fixed bottom-6 right-6 z-20 flex flex-col gap-2">
      <button
        type="button"
        aria-label="Vorige"
        onClick={onPrev}
        disabled={!canPrev}
        className="flex h-11 w-11 items-center justify-center rounded border border-ink/15 bg-white text-ink shadow-sm transition hover:bg-panel disabled:cursor-not-allowed disabled:opacity-30"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Volgende"
        onClick={onNext}
        disabled={!canNext}
        className="flex h-11 w-11 items-center justify-center rounded border border-ink/15 bg-accent text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
