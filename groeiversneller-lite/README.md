# Groeiversneller Lite (campagne "Meer tijd. Minder zorgen.")

Publieke, kortere versie van de Nmbrs Groeiversneller. Prospects vullen hem zelf in
via een campagnelink. Ze komen uit bij een persoonlijk groeiverhaal als PDF; die
downloaden ze pas nadat ze hun NAWET-gegevens hebben achtergelaten. Die gegevens
komen in een Google Sheet, zodat sales ze kan opvolgen.

## Flow
1. **Start** – herkenbaar aan de campagne: "Meer groei. Minder gedoe.", "Meer tijd. Minder zorgen.", "GoGoGrow!".
2. **Scan** – 5 thema's, 26 stellingen: Arbeidsvoorwaarden & Contract, Voorbereiden op eerste werkdag,
   Administratie bij indiensttreding, Salarisverwerking, Ontwikkeling van medewerkers.
   De invuller tikt aan wat binnen het eigen bedrijf nog niet goed is ingeregeld.
3. **Prioriteer** – matrix van impact × inspanning. Slepen, of tikken en een vak kiezen (handig op een telefoon).
4. **Business case** – hoeveel tijd ben je nu kwijt? Dit wordt omgerekend naar uren en euro's per jaar.
5. **Groeiverhaal** – score, roadmap, quick wins en de eerste stap. **Download je groeiverhaal (PDF)**
   opent eerst het formulier (naam, organisatie, adres, postcode, plaats, e-mail, telefoon en toestemming).

## Installeren (Google Apps Script)
Alles wat je plakt staat in de map **`apps-script/`**. De app is daar bewust in vijf kleinere
HTML-bestanden geknipt: één groot bestand wordt bij kopiëren en plakken makkelijk afgekapt.

1. Maak op script.google.com een nieuw project.
2. Plak `apps-script/Code.gs` in het bestand Code.gs.
3. Maak via **Bestanden + > HTML** vijf bestanden met precies de namen `index`, `stijl`, `beeld`, `data` en `app`.
   Plak in elk de inhoud van het gelijknamige bestand uit `apps-script/`.
   Voer daarna `diagnose` uit: per bestand staat er in het logboek of het compleet is.
4. Vul in `Code.gs` desgewenst `NOTIFICATIE_EMAIL` in. Dan krijgt sales een e-mail per nieuwe lead.
5. Voer de functie `setup` uit en geef toestemming. De link naar de Sheet staat in het logboek.
6. Kies **Implementeren > Nieuwe implementatie > Web-app**, met *Uitvoeren als: Ik* en *Toegang: Iedereen*.
7. Optioneel: zet in `index.html` de constante `PRIVACY_URL`. Dan komt er een link naar het privacystatement bij de toestemming.

## Eigen adres (groeiversneller.nmbrs.com)
De app werkt op twee adressen tegelijk, allebei met dezelfde Google Sheet:

- **De Apps Script-URL** (`.../exec`): blijft de app gewoon tonen.
- **Een eigen adres**: zet `web/index.html` als gewone webpagina online. Die pagina stuurt
  de gegevens naar de Apps Script-URL (functie `doPost` in `Code.gs`).

Stappen:
1. Host `web/index.html` als `index.html` bij bijvoorbeeld HubSpot, Netlify, Cloudflare Pages
   of de eigen webserver.
2. Laat de DNS-beheerder `groeiversneller.nmbrs.com` naar die hosting verwijzen (meestal een
   CNAME-record; de hostingpartij vertelt welke waarde). Zorg voor https.
3. Test in een incognitovenster: scan invullen, PDF downloaden en kijken of de regel in
   **Lite - Leads** verschijnt.

Belangrijk:
- Werk Apps Script altijd bij via **Implementeren > Implementaties beheren > bewerken > Nieuwe versie**.
  Een *nieuwe implementatie* krijgt een andere URL, en dan slaat de webpagina niets meer op.
- Verandert de URL toch? Zet de nieuwe URL in `OPSLAG_URL` bovenin `bouw_apps_script.py`,
  draai het script opnieuw en zet `web/index.html` opnieuw online.
- De implementatie moet op *Toegang: Iedereen* staan, anders kan de webpagina niet opslaan.
- Utm-parameters werken ook hier: `https://groeiversneller.nmbrs.com/?utm_source=linkedin`.

## Campagnelinks
Plak utm-parameters achter de web-app-URL, bijvoorbeeld:

```
https://script.google.com/macros/s/.../exec?utm_source=linkedin&utm_medium=social&utm_campaign=meer-tijd
```

De bron komt in de kolom **Bron** van de tabbladen Lite - Leads en Lite - Sessies.

## Tabbladen in de Sheet
| Tabblad | Inhoud |
|---|---|
| **Lite - Leads** | Eén regel per prospect die gegevens heeft achtergelaten: NAWET, score, pijnpunten, kosten per jaar, eerste stap en bron. De lavendelkleurige kolommen *Opvolgstatus*, *Eigenaar* en *Notities* zijn voor sales; de app raakt ze niet aan. |
| **Lite - Sessies** | Eén regel per gestarte scan, ook zonder gegevens. Zo zie je waar mensen afhaken (kolommen *Laatste stap* en *Gegevens achtergelaten*). |
| **Lite - Pijnpunten** | Eén regel per aangetikt pijnpunt, voor analyses over alle prospects heen. |

## Aanpassen
Pas teksten of de werking aan in `index.html` (die kun je ook lokaal in een browser openen om te testen).
Maak daarna de Apps Script-bestanden opnieuw met `python3 bouw_apps_script.py`.

## Goed om te weten
- De PDF-blokkade zit in de browser. Wie technisch handig is, kan die omzeilen. Voor leadgeneratie is dat gebruikelijk en acceptabel.
- Lokaal geopend (zonder Apps Script) werkt de app ook. Er wordt dan niets opgeslagen, en de PDF komt na het formulier direct vrij. Handig om te testen.
