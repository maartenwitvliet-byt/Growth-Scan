"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Statement, ThemeWithStatements } from "@/lib/types";
import { loadProgress, saveProgress } from "@/lib/progress";
import ThemeIntroScreen from "./ThemeIntroScreen";
import StatementScreen from "./StatementScreen";
import NavArrows from "./NavArrows";

type Step =
  | { kind: "intro"; theme: ThemeWithStatements; statementsBefore: number }
  | { kind: "statement"; theme: ThemeWithStatements; statement: Statement; globalIndex: number };

export default function ScanWizard({ themes }: { themes: ThemeWithStatements[] }) {
  const router = useRouter();

  const { steps, totalStatements } = useMemo(() => {
    const steps: Step[] = [];
    let before = 0;
    for (const theme of themes) {
      steps.push({ kind: "intro", theme, statementsBefore: before });
      for (const statement of theme.statements) {
        steps.push({ kind: "statement", theme, statement, globalIndex: before });
        before += 1;
      }
    }
    return { steps, totalStatements: before };
  }, [themes]);

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadProgress();
    if (saved) {
      setAnswers(saved.answers ?? {});
      setStepIndex(Math.min(saved.stepIndex ?? 0, steps.length - 1));
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveProgress({ answers, stepIndex, updatedAt: Date.now() });
  }, [answers, stepIndex, hydrated]);

  const step = steps[stepIndex];

  const goNext = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      router.push("/contact");
      return;
    }
    setStepIndex((i) => i + 1);
  }, [stepIndex, steps.length, router]);

  const goPrev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const selectScore = useCallback(
    (statementId: string, score: number) => {
      setAnswers((prev) => ({ ...prev, [statementId]: score }));
    },
    []
  );

  const currentAnswered =
    step?.kind === "statement" ? typeof answers[step.statement.id] === "number" : true;

  // Toetsenbordbediening: cijfers 1-5 kiezen, Enter bevestigt (sectie 3).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!step) return;
      if (step.kind === "statement") {
        if (["1", "2", "3", "4", "5"].includes(e.key)) {
          selectScore(step.statement.id, Number(e.key));
        } else if (e.key === "Enter") {
          if (typeof answers[step.statement.id] === "number") goNext();
        }
      } else if (e.key === "Enter") {
        goNext();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [step, answers, goNext, selectScore]);

  if (!hydrated || !step) {
    return <div className="min-h-screen bg-paper" />;
  }

  return (
    <>
      {step.kind === "intro" ? (
        <ThemeIntroScreen
          theme={step.theme}
          progressPct={totalStatements > 0 ? Math.round((step.statementsBefore / totalStatements) * 100) : 0}
          onContinue={goNext}
        />
      ) : (
        <StatementScreen
          statement={step.statement}
          themeId={step.theme.id}
          themeNaam={step.theme.naam}
          selected={answers[step.statement.id]}
          onSelect={(score) => selectScore(step.statement.id, score)}
          onConfirm={goNext}
          positionLabel={`Stelling ${step.globalIndex + 1} van ${totalStatements}`}
        />
      )}
      <NavArrows onPrev={goPrev} onNext={goNext} canPrev={stepIndex > 0} canNext={currentAnswered} />
    </>
  );
}
