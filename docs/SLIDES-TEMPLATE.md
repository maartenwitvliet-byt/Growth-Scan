# Google Slides-template voorbereiden

De knop **Maak Google Slides** kopieert het master-Slides-bestand
("ACC Groei Scan FULL") en vult het automatisch. Het template hoeft daarvoor
eenmalig te worden voorbereid, met drie soorten markeringen. Werk in een kopie
van de master en zet het id van die kopie in de Script Property
`SLIDES_TEMPLATE_ID`.

> Tip: het master-template heeft al `{{klantnaam}}`, `{{datum}}`, `{{PN}}`,
> `{{ASS}}`, `{{IP}}`, `{{TPP}}`, `{{PEX}}`, `{{PEN}}`, `{{PPE}}` en `{{PHI}}`.
> Die werken direct. De rest hieronder vervangt de vaste voorbeeldcijfers.

## 1. Tekst-placeholders

Typ de placeholder op de plek van het voorbeeldcijfer. De opmaak van het
tekstvak blijft behouden.

### Algemeen
| Placeholder | Wordt |
|---|---|
| `{{klantnaam}}` | Naam van het kantoor |
| `{{datum}}` | Datum van vandaag, bijv. 22-10-2026 |
| `{{versie}}` | Versie (tabblad Instellingen, `rapportVersie`) |
| `{{consultant}}` | Naam van de consultant |
| `{{contactpersoon}}` | Contactpersoon van het kantoor |
| `{{benchmark_aantal}}` | Aantal kantoren in de benchmark |

### Scores (slides Totaaloverzicht en per domein)
Per domein: `{{payroll_jij}}`, `{{payroll_gem}}`, `{{payroll_beste}}`, en
hetzelfde voor `hr`, `tech` en `zelf`. Totaal: `{{totaal_jij}}`,
`{{totaal_gem}}`, `{{totaal_beste}}`.

Per subthema (`_jij`, `_gem`, `_beste` erachter):

| Domein | Subthema-placeholders |
|---|---|
| Salaris | `automatisering`, `flexibiliteit`, `efficiency` |
| HR | `hr_processen`, `verlof_verzuim`, `ontwikkeling`, `hr_efficiency`, `werving` |
| Technologie & Veiligheid | `veiligheid`, `authenticatie`, `gebruikersgemak`, `navigatie` |
| Medewerker Zelfredzaamheid | `zelfservice`, `communicatie`, `declaraties` |

Voorbeeld: `{{verlof_verzuim_gem}}` is het gemiddelde van alle kantoren voor
Verlof- en Verzuimbeheer.

### Benchmark stroken per FTE
`{{stroken_jij}}`, `{{stroken_gem}}`, `{{stroken_potentie}}`

### Waar zit voor jou de meeste winst
`{{kans1_titel}}` en `{{kans1_tekst}}` tot en met `{{kans5_titel}}` en `{{kans5_tekst}}`.

### Groeipotentieel (n = 1, 2, 3 voor jaar 1, 2, 3)
| Slide | Huidig pakket | Met Nmbrs |
|---|---|---|
| Kostprijs per strook | `{{kostprijs_huidig_n}}` | `{{kostprijs_nmbrs_n}}` |
| Groei in stroken (per FTE per maand) | `{{stroken_huidig_n}}` | `{{stroken_nmbrs_n}}` |
| FTE vrijmaken | `{{fte_huidig_n}}` | `{{fte_nmbrs_n}}` |

Tabel "voordeel komende 3 jaar": `{{kosten_huidig_n}}`, `{{kosten_nieuw_n}}`,
`{{conversie_n}}`, `{{voordeel_n}}` en de totalen `{{kosten_huidig_totaal}}`,
`{{kosten_nieuw_totaal}}`, `{{conversie_totaal}}`, `{{voordeel_totaal}}`.
Inclusief de andere domeinen: `{{voordeel_totaal_n}}` en `{{voordeel_alles}}`.

### Prijzen
| Placeholder | Wordt |
|---|---|
| `{{ASS}}` | Aantal salarisstroken per maand |
| `{{PN}}` | Pakketnaam, bijv. Medium 1000 |
| `{{IP}}` | Inbegrepen stroken |
| `{{TPP}}` | Totaalprijs pakket per maand |
| `{{PEX}}`, `{{PEN}}`, `{{PPE}}`, `{{PHI}}` | Expense, Engage, Perform, Hire per maand |
| `{{totaal_per_maand}}` | Pakket plus gekozen opties |

## 2. Grafieken

Vervang een voorbeeldgrafiek door de grafiek uit de app: klik met rechts op de
afbeelding of grafiek → **Alt-tekst** → zet in het veld **Titel**:

| Titel | Grafiek |
|---|---|
| `grafiek:radar-totaal` | Radar Totaaloverzicht |
| `grafiek:radar-payroll` | Radar Salaris |
| `grafiek:radar-hr` | Radar HR |
| `grafiek:radar-tech` | Radar Technologie & Veiligheid |
| `grafiek:radar-zelf` | Radar Medewerker Zelfredzaamheid |
| `grafiek:bm-stroken` | Stroken per FTE: jij, gemiddeld NL, potentie |
| `grafiek:kostprijs` | Kostprijs per strook, 3 jaar |
| `grafiek:stroken` | Stroken per FTE, 3 jaar |
| `grafiek:fte` | FTE vrij te maken, 3 jaar |
| `grafiek:drie-jaar` | Kosten en voordeel over 3 jaar |

De nieuwe grafiek komt op exact dezelfde plek en in dezelfde maat.

## 3. Slides per domein

Slides van domeinen die niet zijn gescoord, verdwijnen automatisch. De export
herkent de domeinslides aan hun titel ("Salaris", "HR", "Technologie &
Veiligheid", "Medewerker Zelfredzaamheid" op een slide met "Resultaten").
Wil je dat expliciet regelen, zet dan in de **sprekersnotities** van de slide:

```
[[domein:payroll]]   [[domein:hr]]   [[domein:tech]]   [[domein:zelf]]
```

## Lettertype

Stratos is niet beschikbaar in Google Slides. Gebruik in het template
**Barlow ExtraBold** als vervanger, zoals de Digital Stylesheet voorschrijft.

## Engelse versie

Maak voor Engelstalige rapporten een Engelse kopie van het template en zet het
id in `SLIDES_TEMPLATE_ID_EN`. Zonder die property gebruikt een Engelse scan
het Nederlandse template (de cijfers kloppen dan wel).
