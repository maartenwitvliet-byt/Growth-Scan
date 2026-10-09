# Groei Versneller (Nmbrs huisstijl)

Losstaande, eenbestands-webapp (`index.html`) voor een groeisessie met een klant:
**Resultaten → Prioriteer → Business case → Groeiverhaal**. Werkt zonder server:
openen in de browser of hosten op een willekeurig https-adres.

## Huisstijl
Gebaseerd op de **Nmbrs Brand Guidelines (16-09-2026)** en de **Nmbrs Digital
Stylesheet (08-07-2026)**:

- **Kleuren**: White, Blurple `#6B5DFF`, Midnight Blue `#010149`, Dark Blue
  `#00001D`, Lavender `#E7E5FF`, Off-White `#FFFBF4`. Coral `#FE6E63` gebruik je
  alleen voor primaire knoppen en kleine highlight-labels, altijd met Dark Blue
  tekst.
- **Typografie**: Stratos Bold voor koppen (−2%, regelhoogte 95%), met Barlow
  Extra Bold als goedgekeurde Google-fallback. Inter voor tekst. Is Stratos lokaal
  of via Adobe Fonts geïnstalleerd, dan wordt die automatisch gebruikt.
- **Logo**: vectorpaden uit de guidelines. Duotone op licht, inverse op Midnight,
  Dark Blue monotone op Blurple (nooit wit op Blurple). In de topbar staat de
  secundaire (horizontale) lockup, op de startpagina en de PDF-cover de primaire.
- **Vormtaal**: pill-knoppen (primair, secundair, tertiair) met opwaartse hover,
  N-vormen als decoratie, grote cijfers, en paginaovergangen met een opwaartse,
  licht schuine beweging.
- **Volume**: functionele stappen licht, het Groeiverhaal "high volume" in Blurple
  en Midnight.
- **Iconen**: Google Material Symbols (Regular, outlined).

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
