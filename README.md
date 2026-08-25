# Revenue Growth Scan

Een Nederlandstalige, mobiel-eerste webapplicatie waarin bezoekers 46 stellingen
beantwoorden over hun marketing- en salesfabriek (Revenue Architecture-methodiek).
Na een contactformulier krijgen ze direct een interactief rapport met benchmark
(gemiddelde + beste deelnemer) en 5 concrete aanbevelingen. Elke inzending
synchroniseert naar Google Sheets en triggert een bedank- + koffie-mail.

Gebouwd met Next.js 14 (App Router, TypeScript), Supabase (Postgres), Recharts,
React Hook Form + Zod, Resend en de Google Sheets API — zoals gespecificeerd in
de bouwprompt.

## 1. Eenmalige setup

### 1.1 Supabase

1. Maak een nieuw Supabase-project aan (kies een **EU-regio**, zie sectie 13
   van de bouwprompt — AVG).
2. Open de SQL-editor en voer `db/schema.sql` uit.
3. Kopieer `Project URL`, `anon public key` en `service_role key` naar je
   `.env.local` (zie `.env.example`).
4. Seed de content en de synthetische startbenchmark:
   ```bash
   npm install
   npm run seed
   ```
   Dit vult `themes` en `statements` met de 46 stellingen uit de bouwprompt,
   en zaait 8 gemarkeerde (`is_seed = true`) voorbeeldinzendingen zodat de
   eerste échte bezoekers nooit een lege benchmark zien. Het script is veilig
   om opnieuw te draaien (upsert op stabiele id's); de seed-submissions worden
   maar één keer aangemaakt.

### 1.2 Content-editor (`/beheer`)

Zet `ADMIN_PASSWORD` en een willekeurige lange `ADMIN_SESSION_SECRET` in je
environment. Log daarna in op `/beheer/login`.

### 1.3 Google Sheets-sync

1. Maak in Google Cloud een service account aan en genereer een JSON-sleutel.
2. Maak een leeg Google Sheet aan en deel het met het service-account e-mailadres
   (rechten: **Editor**).
3. Zet `GOOGLE_SHEETS_CLIENT_EMAIL`, `GOOGLE_SHEETS_PRIVATE_KEY` (met `\n` voor
   newlines, zoals in `.env.example`) en `GOOGLE_SHEETS_SPREADSHEET_ID`.

Zonder deze variabelen slaat de app de sync stilzwijgend over (met een
serverlog) — de gebruiker merkt daar niets van (sectie 14).

### 1.4 E-mail (Resend)

Zet `RESEND_API_KEY` en verifieer je verzenddomein (SPF/DKIM) bij Resend voor
goede afleverbaarheid. Zonder API-key worden de mails overgeslagen (gelogd,
niet zichtbaar voor de gebruiker).

### 1.5 Overige `.env`-variabelen

Zie `.env.example` voor het complete overzicht, waaronder de open TODO's uit
sectie 15 van de bouwprompt:

- `COFFEE_AGENDA_URL` — TODO: agendalink (Calendly/Cal.com) voor de koffie-CTA.
- `COFFEE_EMAIL_DELAY_MINUTES` — TODO: vertraging voor mail 2 (standaard 0 = direct).
- `NEXT_PUBLIC_INDEX_NAME` — naam voor de gecombineerde score (standaard "Groei-Index").
- `ADMIN_PASSWORD` — TODO: wachtwoord voor `/beheer`.
- `NEXT_PUBLIC_SITE_URL` — je domein (TODO, sectie 15.2), gebruikt in de rapport-link in mails.

## 2. Ontwikkelen

```bash
npm install
npm run dev
```

De app draait dan op `http://localhost:3000`. `/scan`, `/rapport/[id]` en
`/beheer` hebben een werkende Supabase-verbinding nodig (zie 1.1).

## 3. Structuur

```
app/            routes (welkom, scan, contact, rapport, beheer, API's)
components/     scan-wizard, rapportvisualisaties, content-editor
lib/            scoring/benchmark-logica, Sheets/e-mail-integratie, validatie
db/             schema.sql, content.json (seed-content), seed.ts
```

## 4. Bewuste keuzes / afwijkingen t.o.v. de letterlijke bouwprompt

Deze bouwprompt is uitgebreid; onderstaande keuzes zijn pragmatisch gemaakt
binnen de opgegeven kaders en zijn eenvoudig aan te passen:

- **`/scan` is één route met client-side stapstatus** in plaats van
  `scan/[step]/page.tsx` per stap. De stappen zijn puur content-gedreven
  (aantal actieve stellingen kan wijzigen via `/beheer`), dus een enkele
  client component die de flattened stappenlijst uit de database opbouwt is
  eenvoudiger correct te houden dan losse server-routes per stapnummer. URL,
  toetsenbordbediening, vaste nav-pijlen en localStorage-autosave werken
  hetzelfde als beschreven in sectie 3.
- **Sheets-sync en e-mail worden vóór de response afgewacht** (met
  `Promise.allSettled` en eigen try/catch per stap) in plaats van een losse
  achtergrondtaak. Next.js 14's stabiele API's bieden geen ingebouwde "voer dit
  uit ná de response"-hook (`unstable_after` bestaat niet in deze versie); de
  submission wordt dus altijd eerst in Postgres opgeslagen, en pas daarna
  wachten we kort op Sheets/e-mail voordat het rapport-id teruggaat. Falen van
  Sheets of e-mail blokkeert nooit het rapport (sectie 14).
- **Drag-to-reorder in `/beheer`** is gebouwd met de native HTML5
  drag-and-drop API (geen extra library) — thema's onderling en stellingen
  binnen hetzelfde thema zijn sleepbaar. Een stelling naar een ánder thema
  verplaatsen gaat via het "Thema"-veld in het bewerkpaneel in plaats van
  cross-lijst slepen.
- **"Kernbegrip vetgedrukt"** in de stellingtekst (sectie 3): de content bevat
  geen markering van welk woord het kernbegrip is, dus de volledige stelling
  wordt in het krachtige display-lettertype getoond in plaats van automatisch
  één woord te gokken en vet te maken.
- **Next.js-versie**: gepind op de laatste gepatchte `14.2.x` in plaats van
  Next 15/16. `npm audit` toont een aantal resterende advisories die pas met
  Next 16 volledig verdwijnen (image-optimizer-DoS, i18n-middleware-bypass,
  server actions op custom servers — geen van alle van toepassing op deze
  app). Een upgrade naar Next 15+ (async `params`/`cookies()`) is een
  overzienbare vervolgstap, maar niet in deze bouwsessie meegenomen om het
  risico op regressies te beperken.

## 5. Nog te doen vóór livegang

- Vul de TODO's uit sectie 15 van de bouwprompt in (logo, domein, agendalink,
  Sheets-ID, `/beheer`-wachtwoord, naam van de index).
- Verifieer je e-maildomein bij Resend (SPF/DKIM).
- Controleer het vermiljoen-accent (`#D8432B`) op tekst-op-kleur-contrast met
  een contrastchecker (sectie 14).
