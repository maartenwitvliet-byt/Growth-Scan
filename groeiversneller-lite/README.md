# Groeiversneller Lite (campagne "Meer tijd. Minder zorgen.")

Publieke, kortere versie van de Nmbrs Groeiversneller. Prospects vullen hem zelf in
via een campagnelink. Ze komen uit bij een persoonlijk groeiverhaal als PDF; die
downloaden ze pas nadat ze hun NAWET-gegevens hebben achtergelaten. Die gegevens
komen in een Google Sheet, zodat sales ze kan opvolgen.

## Flow
1. **Start** – herkenbaar aan de campagne: "Meer groei. Minder gedoe.", "Meer tijd. Minder zorgen.", "Grow, grow, go!".
2. **Scan** – 5 thema's, 26 stellingen: Arbeidsvoorwaarden & Contract, Voorbereiden op eerste werkdag,
   Administratie bij indiensttreding, Salarisverwerking, Ontwikkeling van medewerkers.
   De invuller tikt aan wat binnen het eigen bedrijf nog niet goed is ingeregeld.
3. **Prioriteer** – matrix van impact × inspanning. Slepen, of tikken en een vak kiezen (handig op een telefoon).
4. **Business case** – hoeveel tijd ben je nu kwijt? Dit wordt omgerekend naar uren en euro's per jaar.
5. **Groeiverhaal** – score, roadmap, quick wins en de eerste stap. **Download je groeiverhaal (PDF)**
   opent eerst het formulier (naam, organisatie, adres, postcode, plaats, e-mail, telefoon en toestemming).

## Installeren (Google Apps Script)
1. Maak op script.google.com een nieuw project.
2. Plak `Code.gs` in het bestand Code.gs.
3. Maak via **Bestanden + > HTML** een bestand met de naam `index` en plak daar `index.html` in.
4. Vul in `Code.gs` desgewenst `NOTIFICATIE_EMAIL` in. Dan krijgt sales een e-mail per nieuwe lead.
5. Voer de functie `setup` uit en geef toestemming. De link naar de Sheet staat in het logboek.
6. Kies **Implementeren > Nieuwe implementatie > Web-app**, met *Uitvoeren als: Ik* en *Toegang: Iedereen*.
7. Optioneel: zet in `index.html` de constante `PRIVACY_URL`. Dan komt er een link naar het privacystatement bij de toestemming.

## Campagnelinks
Plak utm-parameters achter de web-app-URL, bijvoorbeeld:

```
https://script.google.com/macros/s/.../exec?utm_source=linkedin&utm_medium=social&utm_campaign=meer-tijd
```

De bron komt in de kolom **Bron** van de tabbladen Leads en Sessies.

## Tabbladen in de Sheet
| Tabblad | Inhoud |
|---|---|
| **Leads** | Eén regel per prospect die gegevens heeft achtergelaten: NAWET, score, pijnpunten, kosten per jaar, eerste stap en bron. De lavendelkleurige kolommen *Opvolgstatus*, *Eigenaar* en *Notities* zijn voor sales; de app raakt ze niet aan. |
| **Sessies** | Eén regel per gestarte scan, ook zonder gegevens. Zo zie je waar mensen afhaken (kolommen *Laatste stap* en *Gegevens achtergelaten*). |
| **Pijnpunten** | Eén regel per aangetikt pijnpunt, voor analyses over alle prospects heen. |

## Goed om te weten
- De PDF-blokkade zit in de browser. Wie technisch handig is, kan die omzeilen. Voor leadgeneratie is dat gebruikelijk en acceptabel.
- Lokaal geopend (zonder Apps Script) werkt de app ook. Er wordt dan niets opgeslagen, en de PDF komt na het formulier direct vrij. Handig om te testen.
