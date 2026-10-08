# Groei Versneller (Nmbrs huisstijl)

Losstaande, eenbestands-webapp (`index.html`) voor een groeisessie met een klant:
**Resultaten → Prioriteer → Business case → Groeiverhaal**. Werkt zonder server:
openen in de browser of hosten op een willekeurig https-adres.

## Huisstijl
Gebaseerd op het Nmbrs brandbook (brand.nmbrs.com, maart 2026):
Nmbrs Blue `#1C98EB`, People `#164B88`, Agile `#E9F5FD`, Cloud `#FFFFFF`,
Action `#5EBF4D` (alleen CTA's), Vibe `#4EAEEF`, Text `#163E59`.
Logo: symbool altijd blauw, woordmerk in Text-blauw of wit. Op donkere vlakken
wordt de witte woordmerk-variant gebruikt. De squircle van het N°-symbool en het
N°-teken zijn als vormtaal doorgevoerd.

Typografie: Ubuntu (koppen) en Source Sans 3 (tekst). Dit is een aanname, want de
typografiepagina van het brandbook was niet publiek bereikbaar. Wissel het om via
`--font-head` en `--font-body` als het brandbook iets anders voorschrijft.

## Inhoud aanpassen
Thema's en stellingen staan in het `THEMES`-blok (eerste `<script>`), met per
stelling `titel`, `stelling`, `oplossing`, `waarde` en `functies`.

## Gedrag
- De sessie wordt lokaal in de browser bewaard (localStorage). Na een refresh
  kun je hem op het startscherm hervatten. Er gaat niets naar een server.
- Met "Verstuur naar Google Doc" post je naar een Zapier Catch Hook. Het tandwiel
  overschrijft de URL per browser. De payload bevat sinds deze versie ook
  `eerste_stap` en `gewenste_startdatum`.
- Print / PDF levert een A4-rapport op, met voor- en achterkant.
