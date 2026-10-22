# Nmbrs Groei Scan

Webapplicatie voor de Nmbrs Groei Scan voor accountants- en
administratiekantoren. Een consultant scoort samen met het kantoor 82
stellingen van 1 (onvoldoende ontwikkeld) tot 5 (uitstekend ontwikkeld). De app
vergelijkt de scores met de benchmark, rekent de business case uit, stelt een
pakket voor en maakt het groeirapport als presentatie, PDF en Google Slides.

Gebouwd op **Google Apps Script**, met een **Google Sheet** als database,
benchmark en dashboard, en een koppeling met **HubSpot**. Nederlands en Engels.

## Twee modi, één app

| | Begeleide modus | Campagnemodus |
|---|---|---|
| Voor | Nmbrs-consultants, samen met het kantoor | Prospects, zelfstandig |
| Toegang | Google-login, alleen accounts uit het tabblad Consultants | Openbare link met `?modus=campagne` |
| Stappen | Start · Kerncijfers · Scan · Resultaten · Prioriteren · Business case · Voorstel · Rapport | Start · Scan · Resultaten · Business case · Rapport |
| Rapport | Presenteren, PDF, Google Slides, HubSpot | PDF na het achterlaten van contactgegevens |
| Prijzen | Ja, uit de prijslijst | Nee |

## Wat zit waar

```
apps-script/          alles wat naar Apps Script gaat (clasp rootDir)
  Code.js             doGet, modus en gebruiker bepalen
  Api.js              functies voor de browser (opslaan, afronden, leads, Slides, HubSpot)
  Store.js            Google Sheet: content, scans, antwoorden, benchmark, cache
  Calc.js             rekenmodel (server, browser en tests gebruiken hetzelfde bestand)
  HubSpot.js          bedrijf, contact en notitie (geen deal)
  Slides.js           export uit het mastertemplate + PDF
  Setup.js            eenmalige inrichting, menu in de Sheet
  Teksten.js          alle teksten NL/EN (te overschrijven in de Sheet)
  Seed.js             GEGENEREERD: startdata uit de Excel
  Index.html          pagina; Styles/ReportStyles (huisstijl), Core/Views/Report/Charts (app)
  CalcClient.html, TekstenClient.html   GEGENEREERD uit Calc.js en Teksten.js
data/
  excel_extract.json  GEGENEREERD: stellingen, 46 kantoren (geanonimiseerd), uren, prijzen
  content.json        aanvullingen: Engelse teksten, functionaliteit per stelling, inspanning
tools/                extract_excel.py (Excel -> JSON) en build.mjs (JSON -> Seed.js)
test/                 rekenmodel tegen de Excel, server met nagebootste Google-diensten
dev/                  lokale ontwikkelserver en end-to-end-test (Playwright)
docs/SLIDES-TEMPLATE.md   placeholders voor het Google Slides-template
```

## Eenmalige installatie

Alles gebeurt ingelogd als **sales.nmbrs@visma.com** (eigenaar van script, Sheet
en rapportmap).

1. **Code naar Apps Script**
   ```bash
   npm install -g @google/clasp
   clasp login
   clasp create --type standalone --title "Nmbrs Groei Scan" --rootDir apps-script
   npm run push              # bouwt Seed.js en de client-bestanden en pusht
   ```
2. **Inrichten:** open het project (`clasp open`), kies de functie `setup` en
   klik op Uitvoeren. Geef toestemming. Dit maakt de Google Sheet
   "Nmbrs Groei Scan · Data" met alle tabbladen, importeert de 82 stellingen,
   de 46 benchmarkkantoren, de prijslijst en de teksten, maakt de Drive-map
   "Nmbrs Groei Scan · Rapporten" en installeert het menu "Groei Scan" in de Sheet.
3. **Script Properties** (Projectinstellingen → Script Properties):
   | Sleutel | Waarde |
   |---|---|
   | `SLIDES_TEMPLATE_ID` | id van het voorbereide Slides-template (zie [docs/SLIDES-TEMPLATE.md](docs/SLIDES-TEMPLATE.md)) |
   | `SLIDES_TEMPLATE_ID_EN` | optioneel: Engelse versie van het template |
   | `HUBSPOT_TOKEN` | token van een HubSpot private app (zie hieronder) |
   `SPREADSHEET_ID` en `RAPPORT_MAP_ID` zet `setup()` zelf.
4. **Consultants:** vul het tabblad **Consultants** (e-mail, naam, rol
   `consultant` of `beheerder`, actief `TRUE`). Beheerders zien alle scans.
5. **Twee deployments** (Implementeren → Nieuwe implementatie → Web-app):
   | Deployment | Uitvoeren als | Wie heeft toegang |
   |---|---|---|
   | Begeleid | Ik (sales.nmbrs@visma.com) | Iedereen binnen Visma |
   | Campagne | Ik (sales.nmbrs@visma.com) | Iedereen |

   Campagnelink: `<url van deployment Campagne>?modus=campagne&utm_source=linkedin&utm_campaign=...`.
   Taal vastzetten kan met `&taal=en`. Op nmbrs.com inbouwen kan met een iframe;
   de app staat dat toe.

### HubSpot
Maak in HubSpot een **private app** met de scopes
`crm.objects.companies.read`, `crm.objects.companies.write`,
`crm.objects.contacts.read` en `crm.objects.contacts.write`, en zet het token in
`HUBSPOT_TOKEN`. Per scan zoekt de app het bedrijf (op domein, dan op naam) of
maakt het aan, doet hetzelfde met het contact, koppelt beide en zet een
notitie met scores, besparing, grootste kansen, pakketadvies en rapportlinks.
Er wordt **geen deal** aangemaakt. In de campagnemodus gebeurt dit automatisch
na het leadformulier; in de begeleide modus met de knop "Naar HubSpot".

## Beheer in de Google Sheet

| Tabblad | Wat je hier doet |
|---|---|
| Stellingen | Teksten NL/EN, oplossing, functionaliteit, doelscore, `actief`, en `toonAls` (zie hieronder) |
| Functies | Naam, korte beschrijving NL/EN en inspanning (laag, midden, hoog) per Nmbrs-functionaliteit |
| Instellingen | Salaris, werkgeverslasten, % salarisverwerking, softwarekosten, efficiëntie per jaar, conversie, methode "beste" |
| Urenbenchmark | Uren per payroll-activiteit (basis van de business case) |
| Pakketten, Startpakketten, Opties | De prijslijst (Pricing 26) |
| Teksten | Elke tekst van de app en het rapport, NL en EN |
| Scans, Antwoorden, Leads | Uitkomsten. Zet `inBenchmark` op `FALSE` om een scan buiten de benchmark te houden |
| Benchmark, Dashboard | Berekend: gemiddeld en beste per stelling, subthema en domein; totale inzichten |

Wijzigingen zijn direct zichtbaar: een bewerking in de Sheet leegt de cache.
Via het menu **Groei Scan** kun je de content opnieuw inlezen en de benchmark
herberekenen.

**Voorwaarden (`toonAls`).** Een stelling verschijnt alleen als aan de
voorwaarde is voldaan, bijvoorbeeld `H16 >= 4`. Leeg betekent altijd tonen.
Zo is de regel "Als 1,2,3 dan de vragen skippen" uit de Excel later in te vullen
zodra duidelijk is hoe die moet werken. Nu staat er nog niets.

## Rekenmodel

Het rekenmodel volgt de MASTER-Excel en is daartegen getest (`npm test`):

- **Scores:** subthema = gemiddelde van de stellingen, domein = gemiddelde van
  de subthema's, totaal = gemiddelde van de gekozen domeinen.
- **Business case Payroll:** tabblad "Business Case berekening". Kosten per
  strook = salaris × werkgeverslasten × 12 × % salarisverwerking ÷ (stroken per
  FTE × 12) + softwarekosten. Inefficiëntie per strook = maandloon × Σ
  (urenaandeel × (1 − score ÷ 5)) ÷ stroken per FTE. Met Nmbrs 20/40/80% van die
  winst in jaar 1/2/3, zonder Nmbrs 2/4/8%, en € 5.000 conversie in jaar 1.
  Uitkomst voor het voorbeeldkantoor: € 11.582,75 · € 33.165,51 · € 66.331,02,
  tot op de cent gelijk aan de Excel.
- **HR, Technologie, Zelfredzaamheid:** uren per week × uurtarief × 52 ×
  (1 − domeinscore ÷ 5), met dezelfde opbouw van 20/40/80%.
- **Benchmark:** de 46 Typeform-kantoren plus elke afgeronde scan. "Gemiddeld"
  zoals de Excel. "Beste" is standaard het gemiddelde van de best scorende 10%
  kantoren (`besteMethode = top10`); met `excel` wordt het de hoogste score per
  stelling, zoals in de Excel.
- **Prioriteren:** per Nmbrs-functionaliteit. Impact = 60% het gat tot de
  Nmbrs-doelscore en 40% het gewicht in euro's; inspanning per functionaliteit.
  De consultant kan elk punt verslepen.
- **Pakketadvies:** het goedkoopste pakket (pakketprijs + extra stroken × prijs
  per strook), zoals Pricing 26.

### Gevonden in de Excel
- In "Resultaten Typeform" staan 23 van de 46 aantallen stroken en 8 aantallen
  FTE als tekst in de cel. `AVERAGE` slaat die over, waardoor het
  NL-gemiddelde 1.247 stroken per FTE werd. Over alle 46 kantoren is het
  **1.101**; de app gebruikt dat.
- De F-kolom van de domeintabbladen ("Typeform-kolom") loopt vanaf kolom W één
  kolom achter. De app koppelt op de tekst van de stelling.
- Bij een overgeslagen stelling pakt de Excel het antwoord van een eerder
  kantoor (INDEX op de laatste gevulde cel). De app laat die stelling leeg.
- In Pricing 26 staan `#REF!`-verwijzingen; de app gebruikt de tabellen zelf.
- De stellingen staan letterlijk zoals in de Excel, dus inclusief tikfouten
  ("Ik wordt", "vezamelen", "jaarovergang te verwerken te voeren"). Aanpassen
  kan in het tabblad Stellingen.

## Ontwikkelen

```bash
npm install          # alleen nodig voor de lokale PDF-test
npm test             # rekenmodel + server (22 tests)
npm run dev          # http://localhost:8080/?modus=begeleid  of  ?modus=campagne
npm run e2e          # met npm run dev actief: doorloopt beide modi in Chromium
node tools/demo.mjs  # losse demo-pagina dev/demo.html (#campagne voor de campagnemodus)
```

De Excel staat niet in git (persoonsgegevens). Na een nieuwe versie van de
Excel:

```bash
python3 tools/extract_excel.py "pad/naar/MASTER.xlsx"
npm test && npm run push
```

Daarna in de Apps Script-editor `herimporteerContent()` uitvoeren om de
content in de Sheet te vervangen; scans en antwoorden blijven staan.
