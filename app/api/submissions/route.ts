import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getAllContent } from "@/lib/content";
import { computeScores } from "@/lib/scoring";
import { submissionSchema } from "@/lib/validation";
import { appendSubmissionToSheet } from "@/lib/sheets";
import { sendResultEmails } from "@/lib/email";
import type { Answer, Submission } from "@/lib/types";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige request body." }, { status: 400 });
  }

  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ongeldige gegevens.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { answers, sector, ...contact } = parsed.data;

  if (Object.keys(answers).length === 0) {
    return NextResponse.json({ error: "Geen antwoorden ontvangen." }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { themes, statements } = await getAllContent();
  const validStatementIds = new Set(statements.map((s) => s.id));

  const answerRows = Object.entries(answers)
    .filter(([statementId]) => validStatementIds.has(statementId))
    .map(([statement_id, score]) => ({ statement_id, score }));

  const { scan1Total, scan2Total } = computeScores(answerRows, statements, themes);

  const { data: submission, error: insertErr } = await supabase
    .from("submissions")
    .insert({
      company_name: contact.company_name,
      contact_name: contact.contact_name,
      email: contact.email,
      phone: contact.phone,
      sector: sector || null,
      consent_marketing: contact.consent_marketing,
      scan1_total: scan1Total,
      scan2_total: scan2Total,
      status: "completed",
      is_seed: false,
    })
    .select("*")
    .single();

  if (insertErr || !submission) {
    console.error("[submissions] insert mislukt", insertErr);
    return NextResponse.json({ error: "Opslaan is mislukt. Probeer het opnieuw." }, { status: 500 });
  }

  const { error: answersErr } = await supabase
    .from("answers")
    .insert(answerRows.map((a) => ({ submission_id: submission.id, ...a })));

  if (answersErr) {
    console.error("[submissions] antwoorden opslaan mislukt", answersErr);
    return NextResponse.json({ error: "Opslaan is mislukt. Probeer het opnieuw." }, { status: 500 });
  }

  const reportUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/rapport/${submission.id}`;
  const fullAnswers: Answer[] = answerRows.map((a) => ({ submission_id: submission.id, ...a }));

  // Sheets-sync en e-mail mogen de gebruiker nooit laten wachten op een trage
  // externe API en falen mag nooit zichtbaar zijn (sectie 11 & 14). Next 14's
  // stabiele API's bieden geen "na de response" hook zoals unstable_after, dus
  // we wachten ze hier af (met eigen try/catch + korte doorlooptijd) in
  // plaats van een losse achtergrondtaak te starten die de serverless-functie
  // niet gegarandeerd laat afmaken.
  await Promise.allSettled([
    appendSubmissionToSheet(submission as Submission, fullAnswers, statements),
    sendResultEmails({
      to: submission.email,
      contactName: submission.contact_name,
      companyName: submission.company_name,
      reportUrl,
    }),
  ]);

  return NextResponse.json({ id: submission.id });
}
