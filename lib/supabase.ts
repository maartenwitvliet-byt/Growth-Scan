import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Publieke client — leest alleen actieve thema's/stellingen (RLS-policy in db/schema.sql).
 * Bruikbaar in client components voor de scan-wizard.
 */
export function getPublicSupabase(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is niet geconfigureerd — zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY (zie .env.example)."
    );
  }
  return createClient(url, anonKey);
}

/**
 * Server-only client met service-role key — omzeilt RLS.
 * Gebruik dit alleen in server components / route handlers, nooit in client code.
 */
export function getServiceSupabase(): SupabaseClient {
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase (service role) is niet geconfigureerd — zet SUPABASE_SERVICE_ROLE_KEY (zie .env.example)."
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey && serviceRoleKey);
}
