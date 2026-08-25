export type ScanKey = "scan1" | "scan2";

export interface Theme {
  id: string;
  scan: ScanKey;
  volgorde: number;
  naam: string;
  intro: string;
  plek_in_fabriek: string;
  max_score: number;
  actief: boolean;
}

export interface Statement {
  id: string;
  theme_id: string;
  volgorde: number;
  tekst: string;
  score_1_2: string;
  score_4_5: string;
  betekenis: string;
  richting: string;
  actief: boolean;
  updated_at: string;
}

export interface Submission {
  id: string;
  created_at: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  sector: string | null;
  consent_marketing: boolean;
  scan1_total: number | null;
  scan2_total: number | null;
  status: string;
  is_seed: boolean;
}

export interface Answer {
  submission_id: string;
  statement_id: string;
  score: number;
}

export interface ThemeWithStatements extends Theme {
  statements: Statement[];
}

export const SEED_REAL_SUBMISSION_THRESHOLD = 20;
