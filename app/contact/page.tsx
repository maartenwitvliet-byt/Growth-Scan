"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, SECTOR_OPTIONS, type ContactFormValues } from "@/lib/validation";
import { loadProgress, clearProgress } from "@/lib/progress";

export default function ContactPage() {
  const router = useRouter();
  const [answerCount, setAnswerCount] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const progress = loadProgress();
    setAnswerCount(progress ? Object.keys(progress.answers).length : 0);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { consent_marketing: undefined as unknown as true },
  });

  const onSubmit = async (values: ContactFormValues) => {
    setSubmitError(null);
    const progress = loadProgress();
    if (!progress || Object.keys(progress.answers).length === 0) {
      setSubmitError("We konden je antwoorden niet meer terugvinden. Begin de scan opnieuw.");
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, answers: progress.answers }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Er ging iets mis bij het opslaan.");
      }
      const { id } = await res.json();
      clearProgress();
      router.push(`/rapport/${id}`);
    } catch (err) {
      setProcessing(false);
      setSubmitError(err instanceof Error ? err.message : "Er ging iets mis. Probeer het opnieuw.");
    }
  };

  if (processing) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent motion-reduce:animate-none" />
        <p className="font-display text-lg font-semibold">We berekenen je score en benchmark...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg animate-slide-up motion-reduce:animate-none">
        <h1 className="mb-2 font-display text-3xl font-bold">Bijna klaar</h1>
        <p className="mb-8 text-ink/70">
          {answerCount !== null && (
            <>Je hebt {answerCount} stellingen beantwoord. </>
          )}
          Laat je gegevens achter en je rapport — met benchmark en de 5 belangrijkste kansen —
          verschijnt direct.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <Field label="Bedrijfsnaam" error={errors.company_name?.message}>
            <input {...register("company_name")} className="input" autoComplete="organization" />
          </Field>

          <Field label="Jouw naam" error={errors.contact_name?.message}>
            <input {...register("contact_name")} className="input" autoComplete="name" />
          </Field>

          <Field label="E-mailadres" error={errors.email?.message}>
            <input {...register("email")} type="email" className="input" autoComplete="email" />
          </Field>

          <Field label="Telefoonnummer" error={errors.phone?.message}>
            <input {...register("phone")} type="tel" className="input" autoComplete="tel" />
          </Field>

          <Field label="Sector (optioneel)" error={errors.sector?.message}>
            <select {...register("sector")} className="input" defaultValue="">
              <option value="">Kies een sector...</option>
              {SECTOR_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          <label className="flex items-start gap-3 text-sm text-ink/70">
            <input type="checkbox" {...register("consent_marketing")} className="mt-1 h-4 w-4 rounded border-ink/30" />
            <span>
              Ik ga akkoord dat {process.env.NEXT_PUBLIC_COMPANY_NAME || "jullie"} mij mag mailen over
              mijn resultaat en een vervolggesprek. Geen spam, altijd af te melden.
            </span>
          </label>
          {errors.consent_marketing && (
            <p className="text-sm text-accent">{errors.consent_marketing.message}</p>
          )}

          {submitError && (
            <p className="rounded-lg bg-accent-soft p-3 text-sm text-accent">{submitError}</p>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            Bekijk mijn rapport
          </button>

          <p className="text-xs text-ink/40">
            Je gegevens worden opgeslagen in de EU (Supabase) en gebruikt om je rapport en een
            eventueel vervolggesprek te sturen. Wil je je gegevens laten verwijderen? Mail ons.
          </p>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink/80">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-accent">{error}</span>}
    </label>
  );
}
