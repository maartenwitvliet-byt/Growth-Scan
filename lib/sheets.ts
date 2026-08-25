import { google } from "googleapis";
import type { Statement, Submission, Answer } from "./types";

const SHEET_NAME = "Leads";

function isSheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL &&
      process.env.GOOGLE_SHEETS_PRIVATE_KEY &&
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  );
}

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    // Vercel/​.env bewaren newlines als \n — hier weer terugzetten naar echte newlines.
    key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

/**
 * Zorgt dat het werkblad bestaat en de header-rij overeenkomt met de huidige,
 * actieve stellingen (sectie 11) — zo krijgt een later toegevoegde stelling
 * automatisch een eigen kolom.
 */
async function ensureHeader(sheets: ReturnType<typeof getSheetsClient>, spreadsheetId: string, header: string[]) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === SHEET_NAME);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] },
    });
  }

  const existingHeader = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!1:1`,
  });
  const current = existingHeader.data.values?.[0] ?? [];
  const matches = current.length === header.length && current.every((v, i) => v === header[i]);
  if (!matches) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!1:1`,
      valueInputOption: "RAW",
      requestBody: { values: [header] },
    });
  }
}

/**
 * Append één rij per voltooide, niet-seed submission (sectie 11).
 * Fire-and-forget vanuit de API-route — fouten worden hier gelogd, niet
 * doorgegeven aan de gebruiker (sectie 14).
 */
export async function appendSubmissionToSheet(
  submission: Submission,
  answers: Answer[],
  statements: Statement[]
): Promise<void> {
  if (!isSheetsConfigured()) {
    console.warn("[sheets] niet geconfigureerd — sync overgeslagen voor submission", submission.id);
    return;
  }
  if (submission.is_seed) return;

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

    const activeStatements = [...statements].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    const header = [
      "timestamp",
      "bedrijfsnaam",
      "contactnaam",
      "email",
      "telefoon",
      "sector",
      "scan1_totaal",
      "scan2_totaal",
      ...activeStatements.map((s) => s.id),
    ];
    await ensureHeader(sheets, spreadsheetId, header);

    const scoreByStatement = new Map(answers.map((a) => [a.statement_id, a.score]));
    const row = [
      submission.created_at,
      submission.company_name,
      submission.contact_name,
      submission.email,
      submission.phone,
      submission.sector ?? "",
      submission.scan1_total ?? "",
      submission.scan2_total ?? "",
      ...activeStatements.map((s) => scoreByStatement.get(s.id) ?? ""),
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAME}!A:A`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
  } catch (err) {
    console.error("[sheets] append mislukt voor submission", submission.id, err);
  }
}
