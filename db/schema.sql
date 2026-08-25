-- Revenue Growth Scan — datamodel (zie sectie 4 van de bouwprompt)
-- Voer dit één keer uit in de Supabase SQL-editor (of via `supabase db push`).

create extension if not exists pgcrypto;

create table if not exists themes (
  id text primary key,          -- bv. '1', '7', '12' — stabiel, wijzigt nooit
  scan text not null check (scan in ('scan1', 'scan2')),
  volgorde smallint not null,
  naam text not null,
  intro text not null,
  plek_in_fabriek text not null,
  max_score smallint not null,
  actief boolean not null default true
);

create table if not exists statements (
  id text primary key,          -- bv. '1.1', '5.4', '12.3' — stabiel, wijzigt nooit
  theme_id text references themes(id) on delete cascade,
  volgorde smallint not null,
  tekst text not null,
  score_1_2 text not null,
  score_4_5 text not null,
  betekenis text not null,
  richting text not null,
  actief boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text not null,
  sector text,
  consent_marketing boolean not null default false,
  scan1_total numeric,
  scan2_total numeric,
  status text not null default 'completed',
  is_seed boolean not null default false   -- zie randgeval in sectie 7 van de bouwprompt
);

create table if not exists answers (
  submission_id uuid references submissions(id) on delete cascade,
  statement_id text references statements(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  primary key (submission_id, statement_id)
);

create index if not exists idx_statements_theme on statements(theme_id);
create index if not exists idx_answers_statement on answers(statement_id);
create index if not exists idx_submissions_created on submissions(created_at);

-- Row Level Security: alle toegang loopt via de server (service-role key),
-- dus RLS staat aan met geen policies voor de publieke anon-key.
alter table themes enable row level security;
alter table statements enable row level security;
alter table submissions enable row level security;
alter table answers enable row level security;

-- Publiek lezen van actieve thema's/stellingen mag (nodig om de scan te tonen
-- zonder een API-route ertussen); schrijven gaat altijd via de service-role key.
drop policy if exists "public read active themes" on themes;
create policy "public read active themes" on themes for select using (actief = true);

drop policy if exists "public read active statements" on statements;
create policy "public read active statements" on statements for select using (actief = true);
