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
- **Download als PDF** bouwt een apart ontworpen A4-rapport op uit de sessiedata
  en downloadt het direct als `Groeiverhaal - <klant>.pdf`, zonder printvenster.
  Het rapport bevat een cover, een samenvatting, de analyse per thema, de matrix
  met genummerde pijnpunten, de business case, de roadmap, de aanbevelingen, de
  Nmbrs-oplossingen, de volgende stap en een achterkant. Elke pagina wordt
  1-op-1 omgezet naar A4 (html2canvas 1.4.1 + jsPDF 2.5.1, MIT, ingebouwd in het
  bestand, dus ook offline bruikbaar). Het resultaat is daardoor altijd gelijk,
  ongeacht browser of printer. Lange secties lopen door op vervolgpagina's
  zonder dat een blok wordt gesplitst.
- Ctrl/Cmd+P print hetzelfde rapport via het printvenster (A4, marges "Geen",
  "Achtergrondafbeeldingen" aan). Lukt de directe download onverhoopt niet, dan
  opent de app automatisch dat printvenster.

## Publiceren als Google Apps Script-webapp (met centrale opslag)
1. Ga naar script.google.com en maak een nieuw project.
2. Vervang de inhoud van `Code.gs` door `apps-script/Code.gs`.
3. Kies Bestanden **+** → **HTML**, noem het `index` en plak de volledige inhoud
   van **`apps-script/index.html`** erin (de lichte versie, ca. 200 KB; de
   PDF-bibliotheken worden pas geladen bij de eerste PDF-download). Sla op.
4. Kies bovenin de functie **setup**, klik op **Uitvoeren** en geef toestemming.
   Er verschijnt een Google Sheet "Groeiversneller - Sessies" in je Drive; de
   link staat in het uitvoeringslogboek.
5. **Implementeren → Nieuwe implementatie → Web-app**. Kies bij "Uitvoeren als"
   *Ik* en bij "Wie heeft toegang" de doelgroep, en klik op **Implementeren**.

### Wat wordt er bewaard?
In de Apps Script-webapp wordt elke sessie na iedere wijziging automatisch
bewaard in de Sheet. Rechtsboven naast de klantnaam staat dan "Bewaard".

- **Sessies**: één regel per klantsessie met klant, gestart / laatst
  bijgewerkt, ingevuld door (bij Google Workspace binnen hetzelfde domein),
  laatste stap, groeipotentieel, aantallen per kwadrant, business case, eerste
  stap, startdatum, thema met de meeste pijn, titels van quick wins en grote
  projecten, Nmbrs-functionaliteiten en een volledige back-up (JSON).
- **Pijnpunten**: één regel per gevonden pijnpunt (sessie, klant, thema,
  pijnpunt, kwadrant, functionaliteiten). Handig voor draaitabellen over
  klanten heen.

Een sessie wordt bijgewerkt, niet verdubbeld; ook na "Hervat" blijft het
dezelfde regel. Lukt opslaan niet, dan toont de app "Niet bewaard" en probeert
hij het bij de volgende wijziging opnieuw; lokaal blijft alles bewaard. Wil je
een bestaande Sheet gebruiken, vul dan `SPREADSHEET_ID` in bovenaan Code.gs.
Lokaal geopend (zonder Apps Script) werkt de app zoals voorheen, zonder
centrale opslag.

In Apps Script draait de app in een afgeschermd kader van Google. De PDF
verschijnt daarom in een venster met de knoppen "Download PDF" en "Open in
nieuw tabblad".

### Wit scherm of foutmelding?
- Code.gs controleert bij het openen of `index` compleet is. Is dat niet zo,
  dan toont de web-app een melding met wat er mis is, in plaats van een wit
  scherm.
- Kies in de editor de functie **diagnose** en klik op **Uitvoeren**. Het
  uitvoeringslogboek meldt of index.html compleet is en of de Sheet
  bereikbaar is.
- Na elke wijziging: **Implementeren → Implementaties beheren → potlood →
  Nieuwe versie**.
- Ingelogd met meerdere Google-accounts? Test de link in een incognitovenster.
