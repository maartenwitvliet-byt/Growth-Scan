/**
 * Groeiversneller Lite (Nmbrs campagne) - Google Apps Script web-app
 *
 * Publieke versie voor prospects: 5 thema's, matrix, business case en groeiverhaal.
 * De PDF komt pas vrij nadat iemand zijn NAWET-gegevens heeft achtergelaten;
 * die gegevens komen in het tabblad "Leads" van de Google Sheet, zodat sales ze kan opvolgen.
 *
 * Dit project bestaat uit zes bestanden (map groeiversneller-lite/apps-script in de repository):
 *   1. Code.gs     - dit bestand: serveert de app en bewaart sessies en leads in een Google Sheet.
 *   2. index.html  - de pagina zelf; voegt de drie bestanden hieronder in.
 *   3. stijl.html  - de vormgeving.
 *   4. beeld.html  - het campagnebeeld.
 *   5. data.html   - de thema's en stellingen.
 *   6. app.html    - de werking.
 *   Maak in de Apps Script-editor via Bestanden + HTML vijf HTML-bestanden met precies de
 *   namen index, stijl, beeld, data en app (zonder ".html") en plak in elk de inhoud van het
 *   gelijknamige bestand. De app is bewust in stukken geknipt: één groot bestand wordt bij
 *   kopiëren en plakken makkelijk afgekapt.
 *
 * Wit scherm of foutmelding? Kies bovenin de functie "diagnose" en klik op Uitvoeren;
 * het Uitvoeringslogboek vertelt wat er mis is.
 *
 * Eenmalig instellen:
 *   - Vul eventueel NOTIFICATIE_EMAIL hieronder in (een e-mail per nieuwe lead).
 *   - Kies bovenin de functie "setup" en klik op Uitvoeren. Geef toestemming.
 *     Er wordt een Google Sheet "Groeiversneller Lite - Leads & sessies" in je Drive aangemaakt;
 *     de link staat daarna in het Uitvoeringslogboek.
 *   - Publiceren: Implementeren > Nieuwe implementatie > Type: Web-app,
 *     "Uitvoeren als: Ik" en "Wie heeft toegang: Iedereen".
 *     Alleen zo kunnen prospects zonder Google-account de scan invullen.
 *   - Eigen adres (bijv. groeiversneller.nmbrs.com): zet het bestand web/index.html uit de
 *     repository op dat adres. Die pagina slaat via doPost hieronder op in dezelfde Sheet.
 *     Werk de implementatie altijd bij via "Implementaties beheren" (nieuwe versie), niet via
 *     een nieuwe implementatie: dan blijft de /exec-URL gelijk.
 *   - Campagnelinks: zet utm-parameters achter de web-app-URL, bijvoorbeeld
 *     .../exec?utm_source=linkedin&utm_medium=social&utm_campaign=meer-tijd
 *     De bron komt mee in de tabbladen Sessies en Leads.
 *
 * Tabbladen in de Sheet:
 *   Lite - Leads       - een regel per prospect (nog geen Nmbrs Payroll-klant) die zijn gegevens
 *                        heeft achtergelaten (voor opvolging).
 *   Lite - Klanten     - idem, voor wie aangeeft al Nmbrs Payroll te gebruiken.
 *                 De kolommen "Opvolgstatus", "Eigenaar" en "Notities" zijn voor sales en
 *                 worden door de app nooit overschreven.
 *   Lite - Sessies     - een regel per ingevulde scan, ook zonder gegevens (handig om afhakers te zien).
 *   Lite - Pijnpunten  - een regel per gevonden pijnpunt, handig voor analyses over prospects heen.
 */

/** Naam van het HTML-hoofdbestand in dit project (zonder ".html"). */
var HTML_BESTAND = 'index';

/**
 * De HTML-bestanden van de app, met een stukje code dat aan het eind van elk bestand staat.
 * Let op: dit moet echte code zijn, geen commentaar; Apps Script laat HTML- en
 * CSS-commentaar weg bij het inlezen van een bestand.
 */
var HTML_DELEN = {
  index: '</body>',
  stijl: 'gv-einde-stijl',
  beeld: '__GV_EINDE_BEELD',
  data: '__GV_EINDE_DATA',
  app: '__GV_EINDE_APP'
};

/** Naam van de Sheet die automatisch wordt aangemaakt. */
var SHEET_NAAM = 'Groeiversneller Lite - Leads & sessies';

/**
 * Optioneel: ID van een bestaande Sheet (het stuk tussen /d/ en /edit in de link).
 * Leeg laten = bij "setup" automatisch een nieuwe Sheet aanmaken.
 * De lite-versie maakt in die Sheet eigen tabbladen aan (Lite - Leads, Lite - Sessies,
 * Lite - Pijnpunten) en laat bestaande tabbladen met rust.
 */
var SPREADSHEET_ID = '';

/** Optioneel: e-mailadres(sen), komma-gescheiden, dat bij elke nieuwe lead een melding krijgt. */
var NOTIFICATIE_EMAIL = '';

// Eigen tabbladnamen, zodat de lite-versie nooit in de tabbladen van de volledige
// Groeiversneller schrijft als beide in dezelfde Sheet staan (die hebben andere kolommen).
var TAB_LEADS = 'Lite - Leads';          // prospects: gebruiken Nmbrs Payroll nog niet
var TAB_KLANTEN = 'Lite - Klanten';      // bestaande klanten van Nmbrs Payroll
var TAB_SESSIES = 'Lite - Sessies';
var TAB_PIJNPUNTEN = 'Lite - Pijnpunten';

// Eigen geheugensleutel: een Sheet die de volledige Groeiversneller in dit project
// heeft onthouden, wordt zo niet per ongeluk hergebruikt.
var PROP_SHEET = 'SPREADSHEET_ID_LITE';

var KOLOMMEN_LEADS = [
  'Sessie-ID', 'Ontvangen', 'Naam', 'Organisatie', 'Adres', 'Postcode', 'Plaats', 'E-mail',
  'Telefoon', 'Toestemming contact', 'Groeipotentieel', 'Pijnpunten', 'Quick wins',
  'Grote projecten', 'Uren per week', 'Kosten per jaar', 'Eerste stap', 'Gewenste startdatum',
  'Thema met meeste pijn', 'Quick wins (titels)', 'Grote projecten (titels)',
  'Nmbrs-functionaliteiten', 'Bron',
  // Vanaf hier: kolommen voor sales, worden door de app niet aangeraakt.
  'Opvolgstatus', 'Eigenaar', 'Notities'
];
/** Aantal kolommen dat de app vult (de rest is voor sales). */
var LEADS_APP_KOLOMMEN = 23;

var KOLOMMEN_SESSIES = [
  'Sessie-ID', 'Organisatie', 'Gestart', 'Laatst bijgewerkt', 'Gegevens achtergelaten', 'Laatste stap',
  'Groeipotentieel', 'Pijnpunten', 'Geprioriteerd', 'Quick wins', 'Grote projecten',
  'Nice to have', 'Heroverwegen', 'Uren per week', 'Uurtarief', 'Kosten per jaar',
  'Kosten per maand', 'Eerste stap', 'Gewenste startdatum', 'Thema met meeste pijn',
  'Quick wins (titels)', 'Grote projecten (titels)', 'Nmbrs-functionaliteiten', 'Bron', 'Back-up (JSON)'
];

var KOLOMMEN_PIJNPUNTEN = [
  'Sessie-ID', 'Organisatie', 'Laatst bijgewerkt', 'Thema', 'Pijnpunt', 'Kwadrant', 'Nmbrs-functionaliteiten'
];

/**
 * Wordt aangeroepen wanneer iemand de URL van de web-app opent.
 * @return {HtmlOutput} De Groeiversneller Lite.
 */
function doGet() {
  // Alleen een ontbrekend bestand houdt de app tegen. Of een bestand volledig is
  // geplakt, controleert de functie "diagnose"; een onvolledig bestand toont in de
  // app zelf ook een melding onderaan het scherm.
  var probleem = controleerBestaan_();
  if (probleem) return foutpagina_(probleem);
  return HtmlService.createTemplateFromFile(HTML_BESTAND).evaluate()
    .setTitle('Groeiversneller | Nmbrs')
    // Nodig voor een goede weergave op tablet en telefoon.
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    // Wil je de app insluiten op een landingspagina (bijv. nmbrs.com of Google Sites)?
    // Haal dan de twee schuine strepen voor de volgende regel weg.
    // .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    ;
}

/**
 * Ontvangt gegevens van de app als die op een eigen adres draait (bijv. groeiversneller.nmbrs.com)
 * in plaats van binnen Apps Script. De pagina stuurt dan {actie, data} naar de /exec-URL van
 * deze web-app. Dezelfde URL blijft via doGet ook gewoon de app zelf tonen.
 * @param {Object} e Het verzoek van Apps Script.
 * @return {TextOutput} JSON: {ok: true} of {ok: false, fout: '...'}.
 */
function doPost(e) {
  var antwoord;
  try {
    var verzoek = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (verzoek.actie === 'bewaarSessie') {
      antwoord = bewaarSessie(verzoek.data);
    } else if (verzoek.actie === 'bewaarLead') {
      antwoord = bewaarLead(verzoek.data);
    } else {
      throw new Error('Onbekende actie.');
    }
  } catch (err) {
    antwoord = { ok: false, fout: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(antwoord))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Uitvoeren vanuit de editor als de web-app niet goed laadt: controleert of
 * index.html compleet is en of de Sheet bereikbaar is. Zie het Uitvoeringslogboek.
 */
function diagnose() {
  Object.keys(HTML_DELEN).forEach(function (naam) {
    var p = controleerDeel_(naam);
    Logger.log(p ? 'PROBLEEM: ' + p : naam + '.html is compleet (' + deelLengte_(naam) + ' tekens).');
  });
  try {
    Logger.log('Sheet bereikbaar: ' + openSpreadsheet_().getUrl());
  } catch (e) {
    Logger.log('Sheet niet bereikbaar: ' + e.message + ' (voer "setup" uit).');
  }
  Logger.log(NOTIFICATIE_EMAIL ? 'Leadmeldingen gaan naar: ' + NOTIFICATIE_EMAIL : 'Geen NOTIFICATIE_EMAIL ingesteld: geen e-mail bij nieuwe leads.');
  Logger.log('Tip: test de web-app in een incognitovenster om te zien wat een prospect ziet.');
}

/**
 * Wordt vanuit index.html aangeroepen (<?!= include('stijl'); ?>) om de andere
 * HTML-bestanden in te voegen.
 */
function include(naam) {
  return HtmlService.createHtmlOutputFromFile(naam).getContent();
}

/** Geeft een omschrijving terug als een van de HTML-bestanden ontbreekt, anders ''. */
function controleerBestaan_() {
  var namen = Object.keys(HTML_DELEN);
  for (var i = 0; i < namen.length; i++) {
    try { HtmlService.createHtmlOutputFromFile(namen[i]); } catch (e) {
      return 'er is geen HTML-bestand met de naam "' + namen[i] + '" gevonden. ' +
        'Maak via Bestanden + HTML een bestand met precies die naam en plak daar ' + namen[i] + '.html in.';
    }
  }
  return '';
}

function controleerDeel_(naam) {
  var inhoud;
  try {
    inhoud = HtmlService.createHtmlOutputFromFile(naam).getContent();
  } catch (e) {
    return 'er is geen HTML-bestand met de naam "' + naam + '" gevonden. ' +
      'Maak via Bestanden + HTML een bestand met precies die naam en plak daar ' + naam + '.html in.';
  }
  if (inhoud.indexOf(HTML_DELEN[naam]) === -1) {
    return 'het bestand "' + naam + '" lijkt niet volledig geplakt (' + inhoud.length + ' tekens gevonden). ' +
      'Open ' + naam + '.html opnieuw, selecteer alles (Ctrl+A), kopieer, en plak het in het bestand "' + naam + '". ' +
      'Sla op en maak daarna een nieuwe versie van de implementatie.';
  }
  return '';
}

function deelLengte_(naam) {
  try { return HtmlService.createHtmlOutputFromFile(naam).getContent().length; } catch (e) { return 0; }
}

function foutpagina_(melding) {
  var html = '<div style="font-family:Arial,sans-serif;max-width:640px;margin:48px auto;padding:28px 32px;' +
    'border-radius:16px;background:#E7E5FF;color:#00001D">' +
    '<h2 style="margin:0 0 12px">De Groeiversneller kan niet starten</h2>' +
    '<p style="line-height:1.5;margin:0">' + escapeHtml_(melding) + '</p></div>';
  return HtmlService.createHtmlOutput(html).setTitle('Groeiversneller | Nmbrs');
}

function escapeHtml_(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/**
 * Eenmalig uitvoeren vanuit de editor: maakt de Sheet aan (als die nog niet
 * bestaat), vraagt de benodigde toestemming en toont de link in het logboek.
 */
function setup() {
  var ss = openSpreadsheet_();
  installeerBenchmarkTrigger_();
  vernieuwBenchmark();
  Logger.log('Leads en sessies worden bewaard in: ' + ss.getUrl());
  Logger.log('De benchmark-tabbladen worden elk uur vernieuwd.');
  return ss.getUrl();
}

/**
 * Wordt vanuit de app aangeroepen (google.script.run.bewaarSessie) na elke wijziging.
 * Werkt de regel van deze sessie bij, of voegt hem toe als hij nog niet bestaat.
 * Bevat geen contactgegevens; die komen via bewaarLead.
 * @param {Object} data Samenvatting van de sessie, opgebouwd in index.html.
 * @return {{ok: boolean, bijgewerkt: string}}
 */
function bewaarSessie(data) {
  var id = controleerSessie_(data);

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = openSpreadsheet_();
    var nu = new Date();

    // --- Sessies: een regel per sessie (bijwerken of toevoegen) ---
    var sessies = tab_(ss, TAB_SESSIES, KOLOMMEN_SESSIES);
    var rij = zoekRij_(sessies, id);
    var gestart = rij ? sessies.getRange(rij, 3).getValue() : (parseDatum_(data.gestart) || nu);
    // Eenmaal "ja" blijft "ja", ook als een latere opslag het nog niet weet.
    var hadGegevens = rij ? sessies.getRange(rij, 5).getValue() === 'ja' : false;

    var biz = data.businessCase || {};
    var waarden = [
      id,
      tekst_(data.klant),
      gestart,
      nu,
      (hadGegevens || data.gegevensAchtergelaten) ? 'ja' : 'nee',
      tekst_(data.stap),
      getal_(data.score),
      getal_(data.pijnpunten),
      getal_(data.geprioriteerd),
      getal_(data.quickWins),
      getal_(data.groteProjecten),
      getal_(data.niceToHave),
      getal_(data.heroverwegen),
      leegOfGetal_(biz.urenPerWeek),
      leegOfGetal_(biz.uurtarief),
      leegOfGetal_(biz.perJaar),
      leegOfGetal_(biz.perMaand),
      tekst_(data.eersteStap),
      parseDatum_(data.startdatum) || '',
      tekst_(data.topThema),
      tekst_(lijst_(data.quickWinTitels)),
      tekst_(lijst_(data.projectTitels)),
      tekst_(lijst_(data.functionaliteiten)),
      tekst_(data.bron),
      tekst_(JSON.stringify(data.backup || {})).slice(0, 49000)
    ];
    if (rij) {
      sessies.getRange(rij, 1, 1, waarden.length).setValues([waarden]);
    } else {
      sessies.appendRow(waarden);
    }

    // --- Pijnpunten: regels van deze sessie vervangen door de actuele stand ---
    var pijn = tab_(ss, TAB_PIJNPUNTEN, KOLOMMEN_PIJNPUNTEN);
    verwijderRijen_(pijn, id);
    var items = Array.isArray(data.items) ? data.items.slice(0, 200) : [];
    if (items.length) {
      var rijen = items.map(function (it) {
        return [id, tekst_(data.klant), nu, tekst_(it.thema), tekst_(it.titel), tekst_(it.kwadrant), tekst_(lijst_(it.functies))];
      });
      pijn.getRange(pijn.getLastRow() + 1, 1, rijen.length, KOLOMMEN_PIJNPUNTEN.length).setValues(rijen);
    }

    return { ok: true, bijgewerkt: nu.toISOString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Wordt vanuit de app aangeroepen (google.script.run.bewaarLead) wanneer iemand
 * zijn NAWET-gegevens achterlaat om de PDF te downloaden. Pas als dit gelukt is,
 * komt de PDF vrij. Een tweede keer (zelfde sessie) werkt de regel bij.
 * @param {Object} data Samenvatting van de sessie plus data.lead (naam, bedrijf, adres,
 *     postcode, plaats, email, telefoon, toestemming).
 * @return {{ok: boolean}}
 */
function bewaarLead(data) {
  var id = controleerSessie_(data);
  var lead = controleerLead_(data.lead);

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  var nieuw = false;
  try {
    var ss = openSpreadsheet_();
    var nu = new Date();
    // Bestaande klanten en prospects komen in een eigen tabblad. Is het antwoord in dezelfde
    // sessie veranderd, dan verhuist de regel: weg uit het andere tabblad.
    var isKlant = lead.nmbrsKlant === 'ja';
    var leads = tab_(ss, isKlant ? TAB_KLANTEN : TAB_LEADS, KOLOMMEN_LEADS);
    var ander = tab_(ss, isKlant ? TAB_LEADS : TAB_KLANTEN, KOLOMMEN_LEADS);
    verwijderRijen_(ander, id);
    var rij = zoekRij_(leads, id);
    var biz = data.businessCase || {};
    var waarden = [
      id,
      nu,
      tekst_(lead.naam),
      tekst_(lead.bedrijf),
      tekst_(lead.adres),
      alsTekst_(lead.postcode),
      tekst_(lead.plaats),
      tekst_(lead.email),
      alsTekst_(lead.telefoon),
      lead.toestemming ? 'ja' : 'nee',
      getal_(data.score),
      getal_(data.pijnpunten),
      getal_(data.quickWins),
      getal_(data.groteProjecten),
      leegOfGetal_(biz.urenPerWeek),
      leegOfGetal_(biz.perJaar),
      tekst_(data.eersteStap),
      parseDatum_(data.startdatum) || '',
      tekst_(data.topThema),
      tekst_(lijst_(data.quickWinTitels)),
      tekst_(lijst_(data.projectTitels)),
      tekst_(lijst_(data.functionaliteiten)),
      tekst_(data.bron)
    ];
    if (rij) {
      leads.getRange(rij, 1, 1, LEADS_APP_KOLOMMEN).setValues([waarden]);
    } else {
      leads.getRange(leads.getLastRow() + 1, 1, 1, LEADS_APP_KOLOMMEN).setValues([waarden]);
      nieuw = true;
    }

    // Sessie markeren als "gegevens achtergelaten".
    var sessies = tab_(ss, TAB_SESSIES, KOLOMMEN_SESSIES);
    var sRij = zoekRij_(sessies, id);
    if (sRij) sessies.getRange(sRij, 5).setValue('ja');
  } finally {
    lock.releaseLock();
  }

  if (nieuw) stuurMelding_(lead, data);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Hulpfuncties                                                         */
/* ------------------------------------------------------------------ */

function controleerSessie_(data) {
  if (!data || typeof data !== 'object') throw new Error('Geen sessiegegevens ontvangen.');
  var id = String(data.sessieId || '').trim();
  if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) throw new Error('Ongeldige sessie-ID.');
  return id;
}

/** Controleert de NAWET-gegevens opnieuw op de server (de browser is niet te vertrouwen). */
function controleerLead_(lead) {
  if (!lead || typeof lead !== 'object') throw new Error('Geen contactgegevens ontvangen.');
  var schoon = {};
  var velden = { naam: 120, bedrijf: 120, adres: 160, postcode: 10, plaats: 80, email: 160, telefoon: 30 };
  Object.keys(velden).forEach(function (k) {
    var v = String(lead[k] || '').replace(/\s+/g, ' ').trim().slice(0, velden[k]);
    if (!v) throw new Error('Veld "' + k + '" ontbreekt.');
    schoon[k] = v;
  });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(schoon.email)) throw new Error('Ongeldig e-mailadres.');
  if (schoon.telefoon.replace(/\D/g, '').length < 9) throw new Error('Ongeldig telefoonnummer.');
  if (lead.toestemming !== true) throw new Error('Toestemming ontbreekt.');
  schoon.toestemming = true;
  if (lead.nmbrsKlant !== 'ja' && lead.nmbrsKlant !== 'nee') throw new Error('Geef aan of de organisatie al Nmbrs Payroll gebruikt.');
  schoon.nmbrsKlant = lead.nmbrsKlant;
  return schoon;
}

function stuurMelding_(lead, data) {
  if (!NOTIFICATIE_EMAIL) return;
  try {
    var biz = data.businessCase || {};
    var regels = [
      (lead.nmbrsKlant === 'ja' ? 'Bestaande Nmbrs Payroll-klant' : 'Nieuwe lead (nog geen Nmbrs Payroll-klant)') + ' uit de Groeiversneller Lite:',
      '',
      'Naam: ' + lead.naam,
      'Organisatie: ' + lead.bedrijf,
      'Adres: ' + lead.adres + ', ' + lead.postcode + ' ' + lead.plaats,
      'E-mail: ' + lead.email,
      'Telefoon: ' + lead.telefoon,
      '',
      'Groeipotentieel: ' + getal_(data.score) + ' / 100',
      'Pijnpunten: ' + getal_(data.pijnpunten) + ' (quick wins: ' + getal_(data.quickWins) + ', grote projecten: ' + getal_(data.groteProjecten) + ')',
      'Thema met meeste pijn: ' + (data.topThema || '-'),
      'Kosten per jaar (eigen inschatting): ' + (biz.perJaar ? '€ ' + Number(biz.perJaar).toLocaleString('nl-NL') : '-'),
      'Eerste stap: ' + (data.eersteStap || '-'),
      'Bron: ' + (data.bron || '-'),
      '',
      'Alle details: ' + openSpreadsheet_().getUrl()
    ];
    MailApp.sendEmail({
      to: NOTIFICATIE_EMAIL,
      subject: (lead.nmbrsKlant === 'ja' ? 'Klant via Groeiversneller: ' : 'Nieuwe lead Groeiversneller: ') + lead.bedrijf + ' (' + lead.naam + ')',
      body: regels.join('\n'),
      replyTo: lead.email
    });
  } catch (e) {
    // Een mislukte melding mag de download van de prospect nooit blokkeren.
    Logger.log('Melding niet verstuurd: ' + e.message);
  }
}

function openSpreadsheet_() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(PROP_SHEET);
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) { /* verwijderd: opnieuw aanmaken */ }
  }
  var ss = SpreadsheetApp.create(SHEET_NAAM);
  tab_(ss, TAB_LEADS, KOLOMMEN_LEADS);
  tab_(ss, TAB_KLANTEN, KOLOMMEN_LEADS);
  tab_(ss, TAB_SESSIES, KOLOMMEN_SESSIES);
  tab_(ss, TAB_PIJNPUNTEN, KOLOMMEN_PIJNPUNTEN);
  var standaard = ss.getSheetByName('Sheet1') || ss.getSheetByName('Blad1');
  if (standaard && ss.getSheets().length > 1) ss.deleteSheet(standaard);
  props.setProperty(PROP_SHEET, ss.getId());
  return ss;
}

/** Geeft het tabblad terug; maakt het aan met een opgemaakte kopregel als het nog niet bestaat. */
function tab_(ss, naam, kolommen) {
  var sh = ss.getSheetByName(naam);
  if (!sh) {
    sh = ss.insertSheet(naam);
    sh.getRange(1, 1, 1, kolommen.length).setValues([kolommen])
      .setFontWeight('bold').setBackground('#6B5DFF').setFontColor('#00001D');
    sh.setFrozenRows(1);
    if (naam === TAB_LEADS || naam === TAB_KLANTEN) {
      sh.getRange('B:B').setNumberFormat('dd-mm-yyyy hh:mm');
      sh.getRange('P:P').setNumberFormat('€ #,##0');
      sh.getRange('R:R').setNumberFormat('dd-mm-yyyy');
      // Kolommen voor sales in Lavender, zodat duidelijk is wat de app niet aanraakt.
      sh.getRange(1, LEADS_APP_KOLOMMEN + 1, 1, kolommen.length - LEADS_APP_KOLOMMEN).setBackground('#E7E5FF');
      var status = SpreadsheetApp.newDataValidation()
        .requireValueInList(['Nieuw', 'Gebeld', 'Afspraak gepland', 'Voorstel', 'Klant', 'Geen interesse'], true)
        .setAllowInvalid(true).build();
      sh.getRange(2, LEADS_APP_KOLOMMEN + 1, sh.getMaxRows() - 1, 1).setDataValidation(status);
    } else if (naam === TAB_SESSIES) {
      sh.getRange('C:D').setNumberFormat('dd-mm-yyyy hh:mm');
      sh.getRange('O:Q').setNumberFormat('€ #,##0');
      sh.getRange('S:S').setNumberFormat('dd-mm-yyyy');
    } else {
      sh.getRange('C:C').setNumberFormat('dd-mm-yyyy hh:mm');
    }
  }
  return sh;
}

/** Rijnummer van de sessie in kolom A, of 0 als die er nog niet is. */
function zoekRij_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === id) return i + 2;
  }
  return 0;
}

/** Verwijdert alle regels van deze sessie (van onder naar boven, zodat de nummering klopt). */
function verwijderRijen_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]) === id) sh.deleteRow(i + 2);
  }
}

/**
 * Tekst veilig voor Sheets: begint een waarde met = + - of @, dan zou Sheets
 * die als formule lezen. Een apostrof ervoor voorkomt dat.
 */
function tekst_(v) {
  var s = v === null || v === undefined ? '' : String(v);
  s = s.slice(0, 50000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

/** Altijd als tekst opslaan (voorloopnul van 06-nummers en "+31" blijven zo staan). */
function alsTekst_(v) {
  var s = v === null || v === undefined ? '' : String(v);
  return s ? "'" + s : '';
}

function getal_(v) {
  var n = Number(v);
  return isFinite(n) ? n : 0;
}

function leegOfGetal_(v) {
  if (v === null || v === undefined || v === '') return '';
  var n = Number(v);
  return isFinite(n) ? n : '';
}

function lijst_(v) {
  return Array.isArray(v) ? v.map(String).join('\n') : (v ? String(v) : '');
}

function parseDatum_(v) {
  if (!v) return null;
  var d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/* ------------------------------------------------------------------ */
/* Benchmark monitor                                                    */
/* ------------------------------------------------------------------ */
/*
 * Drie tabbladen, elk uur automatisch vernieuwd (en direct na "setup"):
 *   Benchmark            - dashboard: kies een organisatie en zie die naast het gemiddelde
 *                          en de best presterende, totaal en per thema, plus een ranking.
 *   Benchmark - Inzichten - wat valt op over alle inzendingen heen (meest voorkomende
 *                          pijnpunten, eerste stap, bron, funnel, scans per week).
 *   Benchmark - Data     - een regel per afgeronde scan; de bron voor beide tabbladen.
 *
 * Maatstaf is "volwassenheid": het percentage stellingen dat op orde is (niet aangetikt
 * als pijnpunt). Hoger is beter. Bij uren en kosten per jaar is lager beter.
 * Handmatig vernieuwen: kies in de editor de functie "vernieuwBenchmark" en klik op Uitvoeren.
 */

var TAB_BENCH = 'Benchmark';
var TAB_BENCH_INZICHT = 'Benchmark - Inzichten';
var TAB_BENCH_DATA = 'Benchmark - Data';

/** De thema's van de lite-scan met het aantal stellingen (gelijk aan data.html). */
var BENCH_THEMAS = [
  ['Arbeidsvoorwaarden & Contract', 5],
  ['Voorbereiden op eerste werkdag', 6],
  ['Administratie bij indiensttreding', 5],
  ['Salarisverwerking', 4],
  ['Ontwikkeling van medewerkers', 6]
];

var BENCH_KLEUREN = { geselecteerd: '#6B5DFF', gemiddelde: '#C3BFF5', beste: '#010149', accent: '#FE6E63' };

var KOLOMMEN_BENCH_DATA = ['Organisatie (scan)', 'Organisatie', 'Datum', 'Gegevens achtergelaten',
  'Volwassenheid totaal'].concat(BENCH_THEMAS.map(function (t) { return t[0]; })).concat(
  ['Pijnpunten', 'Quick wins', 'Grote projecten', 'Uren per week', 'Kosten per jaar', 'Groeipotentieel',
   'Eerste stap', 'Bron']);

/** Vernieuwt alle benchmark-tabbladen. Draait elk uur via een trigger (zie setup). */
function vernieuwBenchmark() {
  var ss = openSpreadsheet_();
  var sessies = tab_(ss, TAB_SESSIES, KOLOMMEN_SESSIES).getDataRange().getValues().slice(1);
  var pijn = tab_(ss, TAB_PIJNPUNTEN, KOLOMMEN_PIJNPUNTEN).getDataRange().getValues().slice(1);
  var b = berekenBenchmark_(sessies, pijn);
  schrijfBenchData_(ss, b);
  schrijfBenchInzichten_(ss, b);
  schrijfBenchDashboard_(ss, b);
  Logger.log('Benchmark vernieuwd: ' + b.rijen.length + ' afgeronde scans.');
}

/** Zorgt voor precies één uurlijkse trigger op vernieuwBenchmark. */
function installeerBenchmarkTrigger_() {
  var bestaat = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'vernieuwBenchmark';
  });
  if (!bestaat) ScriptApp.newTrigger('vernieuwBenchmark').timeBased().everyHours(1).create();
}

/**
 * Rekent alles uit, zonder iets aan de Sheet te veranderen (los te testen).
 * @param {Array[]} sessies Rijen uit "Lite - Sessies" (zonder kopregel).
 * @param {Array[]} pijn Rijen uit "Lite - Pijnpunten" (zonder kopregel).
 */
function berekenBenchmark_(sessies, pijn) {
  var STAPPEN = ['Scan', 'Prioriteer', 'Business case', 'Groeiverhaal'];
  var totaalStellingen = BENCH_THEMAS.reduce(function (a, t) { return a + t[1]; }, 0);

  // Pijnpunten per sessie per thema
  var perSessie = {};
  pijn.forEach(function (r) {
    var id = String(r[0] || '');
    if (!id) return;
    var p = perSessie[id] || (perSessie[id] = { totaal: 0, thema: {}, titels: [] });
    p.totaal++;
    p.thema[r[3]] = (p.thema[r[3]] || 0) + 1;
    p.titels.push([String(r[4] || ''), String(r[3] || '')]);
  });

  var alle = sessies.filter(function (r) { return r[0]; });
  var afgerond = alle.filter(function (r) { return r[5] === 'Groeiverhaal' || r[4] === 'ja'; });

  // Een regel per afgeronde scan
  var labels = {};
  var rijen = afgerond.map(function (r) {
    var id = String(r[0]);
    var p = perSessie[id] || { totaal: 0, thema: {} };
    var datum = r[2] instanceof Date ? r[2] : parseDatum_(r[2]);
    var label = String(r[1] || 'Onbekend') + (datum ? ' · ' + datumLabel_(datum) : '');
    if (labels[label]) { labels[label]++; label += ' (' + labels[label] + ')'; } else { labels[label] = 1; }
    var themaScores = BENCH_THEMAS.map(function (t) { return 1 - Math.min(t[1], p.thema[t[0]] || 0) / t[1]; });
    return [
      label, String(r[1] || ''), datum || '', r[4] === 'ja' ? 'ja' : 'nee',
      1 - Math.min(totaalStellingen, p.totaal) / totaalStellingen
    ].concat(themaScores).concat([
      p.totaal, getal_(r[9]), getal_(r[10]), leegOfGetal_(r[13]), leegOfGetal_(r[15]), getal_(r[6]),
      String(r[17] || ''), bronNaam_(r[23])
    ]);
  });
  rijen.sort(function (a, b) { return b[4] - a[4]; });   // hoogste volwassenheid eerst

  var ids = {};
  afgerond.forEach(function (r) { ids[String(r[0])] = true; });

  // Meest aangetikte pijnpunten (alleen afgeronde scans)
  var telPijn = {};
  Object.keys(ids).forEach(function (id) {
    ((perSessie[id] || {}).titels || []).forEach(function (t) {
      var k = t[0] + '\u0000' + t[1];
      telPijn[k] = (telPijn[k] || 0) + 1;
    });
  });
  var topPijn = Object.keys(telPijn).map(function (k) {
    var d = k.split('\u0000');
    return [d[0], d[1], telPijn[k], rijen.length ? telPijn[k] / rijen.length : 0];
  }).sort(function (a, b) { return b[2] - a[2] || (a[0] < b[0] ? -1 : 1); }).slice(0, 15);

  // Gemiddelde volwassenheid per thema
  var themaGem = BENCH_THEMAS.map(function (t, i) {
    return [t[0], gemiddelde_(rijen.map(function (r) { return r[5 + i]; }))];
  });

  // Eerste stap
  var stap = telOp_(rijen.map(function (r) { return r[16] || '(nog niet gekozen)'; }));

  // Bron: scans en leads
  var bronTel = {};
  rijen.forEach(function (r) {
    var b = bronTel[r[17]] || (bronTel[r[17]] = [r[17], 0, 0]);
    b[1]++; if (r[3] === 'ja') b[2]++;
  });
  var bron = Object.keys(bronTel).map(function (k) { return bronTel[k]; })
    .sort(function (a, b) { return b[1] - a[1]; });

  // Funnel over alle sessies (ook niet afgeronde)
  var funnel = STAPPEN.map(function (s, i) {
    return ['Bereikte ' + s, alle.filter(function (r) { return STAPPEN.indexOf(r[5]) >= i || r[4] === 'ja'; }).length];
  });
  funnel.push(['Gegevens achtergelaten', alle.filter(function (r) { return r[4] === 'ja'; }).length]);

  // Afgeronde scans en leads per week (maandag als begin)
  var weekTel = {};
  rijen.forEach(function (r) {
    if (!(r[2] instanceof Date)) return;
    var m = maandag_(r[2]);
    var k = m.getTime();
    var w = weekTel[k] || (weekTel[k] = [m, 0, 0]);
    w[1]++; if (r[3] === 'ja') w[2]++;
  });
  var perWeek = Object.keys(weekTel).sort().map(function (k) { return weekTel[k]; });

  return {
    rijen: rijen, topPijn: topPijn, themaGem: themaGem, stap: stap, bron: bron,
    funnel: funnel, perWeek: perWeek, sessiesTotaal: alle.length
  };
}

function schrijfBenchData_(ss, b) {
  var sh = benchTab_(ss, TAB_BENCH_DATA);
  sh.getRange(1, 1, 1, KOLOMMEN_BENCH_DATA.length).setValues([KOLOMMEN_BENCH_DATA])
    .setFontWeight('bold').setBackground('#6B5DFF').setFontColor('#00001D');
  sh.setFrozenRows(1);
  if (b.rijen.length) sh.getRange(2, 1, b.rijen.length, KOLOMMEN_BENCH_DATA.length).setValues(b.rijen);
  sh.getRange('C:C').setNumberFormat('dd-mm-yyyy');
  sh.getRange('E:J').setNumberFormat('0%');
  sh.getRange('O:O').setNumberFormat('€ #,##0');
  sh.getRange('P:P').setNumberFormat('0');
  sh.setColumnWidth(1, 260);
}

function schrijfBenchInzichten_(ss, b) {
  var sh = benchTab_(ss, TAB_BENCH_INZICHT);
  sh.setHiddenGridlines(true);
  sh.setColumnWidth(1, 300);
  sh.getRange('A1').setValue('Inzichten over alle inzendingen').setFontSize(18).setFontWeight('bold');
  sh.getRange('A2').setValue('Laatst vernieuwd: ' + datumLabel_(new Date(), true) + ' · ' +
    b.rijen.length + ' afgeronde scans van ' + b.sessiesTotaal + ' gestarte sessies');

  var blokken = [
    { titel: 'Meest aangetikte pijnpunten', kop: ['Pijnpunt', 'Thema', 'Aantal scans', '% van scans'],
      rijen: b.topPijn, formaat: { 4: '0%' }, grafiek: 'BAR', reeks: [3, 1], hoogte: 420 },
    { titel: 'Gemiddelde volwassenheid per thema', kop: ['Thema', 'Gemiddeld op orde'],
      rijen: b.themaGem, formaat: { 2: '0%' }, grafiek: 'COLUMN', reeks: [2, 1], procent: true },
    { titel: 'Gekozen eerste stap', kop: ['Eerste stap', 'Aantal'],
      rijen: b.stap, grafiek: 'PIE', reeks: [2, 1] },
    { titel: 'Bron van de scans', kop: ['Bron', 'Afgeronde scans', 'Leads'],
      rijen: b.bron, grafiek: 'COLUMN', reeks: [2, 2] },
    { titel: 'Funnel: hoe ver komen bezoekers?', kop: ['Stap', 'Sessies'],
      rijen: b.funnel, grafiek: 'BAR', reeks: [2, 1] },
    { titel: 'Afgeronde scans en leads per week', kop: ['Week van', 'Afgeronde scans', 'Leads'],
      rijen: b.perWeek, formaat: { 1: 'dd-mm-yyyy' }, grafiek: 'LINE', reeks: [2, 2] }
  ];

  var rij = 4;
  blokken.forEach(function (bl) {
    sh.getRange(rij, 1).setValue(bl.titel).setFontSize(13).setFontWeight('bold');
    var kopRij = rij + 1;
    sh.getRange(kopRij, 1, 1, bl.kop.length).setValues([bl.kop])
      .setFontWeight('bold').setBackground('#E7E5FF');
    var n = bl.rijen.length;
    if (n) {
      sh.getRange(kopRij + 1, 1, n, bl.kop.length).setValues(bl.rijen);
      Object.keys(bl.formaat || {}).forEach(function (kol) {
        sh.getRange(kopRij + 1, Number(kol), n, 1).setNumberFormat(bl.formaat[kol]);
      });
      // Grafiek rechts van de tabel: kolom 1 als labels, bl.reeks = [eerste waardekolom, aantal].
      var builder = sh.newChart()
        .setChartType(Charts.ChartType[bl.grafiek])
        .addRange(sh.getRange(kopRij, 1, n + 1, 1))
        .addRange(sh.getRange(kopRij, bl.reeks[0], n + 1, bl.reeks[1]))
        .setNumHeaders(1)
        .setPosition(rij, 6, 0, 0)
        .setOption('title', bl.titel)
        .setOption('width', 620)
        .setOption('height', bl.hoogte || 320)
        .setOption('legend', { position: bl.grafiek === 'PIE' ? 'right' : 'bottom' })
        .setOption('colors', [BENCH_KLEUREN.geselecteerd, BENCH_KLEUREN.beste, BENCH_KLEUREN.accent, BENCH_KLEUREN.gemiddelde]);
      if (bl.procent) builder.setOption('vAxis', { format: 'percent', minValue: 0, maxValue: 1 });
      sh.insertChart(builder.build());
    } else {
      sh.getRange(kopRij + 1, 1).setValue('Nog geen gegevens.').setFontColor('#5B5B74');
    }
    var grafiekRijen = Math.ceil((bl.hoogte || 320) / 21) + 2;
    rij = kopRij + Math.max(n + 3, grafiekRijen);
  });
}

function schrijfBenchDashboard_(ss, b) {
  var sh = benchTab_(ss, TAB_BENCH);
  var D = "'" + TAB_BENCH_DATA + "'!";
  // Formules worden met komma's geschreven; F() zet ze om naar puntkomma's als de Sheet
  // een taal gebruikt waarin dat nodig is (zoals Nederlands).
  var sep = formuleScheiding_(sh);
  var F = function (f) { return sep === ',' ? f : f.replace(/,/g, sep); };
  sh.setHiddenGridlines(true);
  sh.setColumnWidth(1, 20);
  sh.setColumnWidth(2, 260);
  [3, 4, 5, 6].forEach(function (c) { sh.setColumnWidth(c, 130); });

  sh.getRange('B1').setValue('Benchmark monitor · Groeiversneller Lite').setFontSize(20).setFontWeight('bold');
  sh.getRange('B2').setValue('Volwassenheid = percentage stellingen dat op orde is (niet aangetikt als pijnpunt). ' +
    'Laatst vernieuwd: ' + datumLabel_(new Date(), true) + '. Wordt elk uur bijgewerkt.').setFontColor('#5B5B74');

  // KPI's
  sh.getRange('B4:F4').setValues([['Afgeronde scans', 'Leads', 'Conversie naar lead', 'Gem. volwassenheid', 'Gem. kosten per jaar']])
    .setFontColor('#5B5B74');
  sh.getRange('B5:F5').setFormulas([[
    '=COUNTA(' + D + 'A2:A)',
    '=COUNTIF(' + D + 'D2:D,"ja")',
    '=IFERROR(C5/B5,0)',
    '=IFERROR(AVERAGE(' + D + 'E2:E),0)',
    '=IFERROR(AVERAGEIF(' + D + 'O2:O,">0"),0)'
  ].map(F)]).setFontSize(22).setFontWeight('bold').setFontColor('#010149');
  sh.getRange('D5:E5').setNumberFormat('0%');
  sh.getRange('F5').setNumberFormat('€ #,##0');

  // Keuze organisatie
  sh.getRange('B7').setValue('Kies een organisatie:').setFontWeight('bold');
  var keuze = sh.getRange('C7');
  keuze.setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInRange(ss.getSheetByName(TAB_BENCH_DATA).getRange('A2:A'), true).setAllowInvalid(false).build())
    .setBackground('#E7E5FF').setFontWeight('bold');
  var huidige = String(keuze.getValue() || '');
  var bestaatNog = b.rijen.some(function (r) { return r[0] === huidige; });
  if (!bestaatNog) keuze.setValue(b.rijen.length ? nieuwste_(b.rijen)[0] : '');
  sh.getRange('B8').setFormula(F('=IFERROR("Positie "&MATCH(C7,' + D + 'A2:A,0)&" van "&B5&" op volwassenheid","")'))
    .setFontColor('#5B5B74');

  // Tabel 1: volwassenheid per thema (bron voor de grafiek)
  var kolommen = ['E', 'F', 'G', 'H', 'I', 'J'];
  var namen = ['Totaal'].concat(BENCH_THEMAS.map(function (t) { return t[0]; }));
  sh.getRange('B10:E10').setValues([['Volwassenheid (% op orde)', 'Geselecteerd', 'Gemiddelde', 'Beste']])
    .setFontWeight('bold').setBackground('#E7E5FF');
  sh.getRange(11, 2, namen.length, 1).setValues(namen.map(function (n) { return [n]; }));
  sh.getRange(11, 3, namen.length, 3).setFormulas(kolommen.map(function (k) {
    var col = D + k + '2:' + k;
    return [
      '=IFERROR(INDEX(' + col + ',MATCH($C$7,' + D + '$A$2:$A,0)),"")',
      '=IFERROR(AVERAGE(' + col + '),"")',
      '=IFERROR(MAX(' + col + '),"")'
    ].map(F);
  })).setNumberFormat('0%');

  // Tabel 2: kerncijfers
  sh.getRange('B18:F18').setValues([['Kerncijfers', 'Geselecteerd', 'Gemiddelde', 'Beste', 'Beste betekent']])
    .setFontWeight('bold').setBackground('#E7E5FF');
  var kern = [
    ['Pijnpunten', 'K', 'MIN', 'de minste pijnpunten', '0'],
    ['Uren per week kwijt', 'N', 'MINIFS', 'de minste uren kwijt', '0.0'],
    ['Kosten per jaar', 'O', 'MINIFS', 'de laagste kosten', '€ #,##0'],
    ['Groeipotentieel', 'P', 'MAX', 'het hoogste groeipotentieel', '0']
  ];
  kern.forEach(function (k, i) {
    var r = 19 + i, col = D + k[1] + '2:' + k[1];
    var beste = k[2] === 'MINIFS' ? '=IFERROR(MINIFS(' + col + ',' + col + ',">0"),"")' : '=IFERROR(' + k[2] + '(' + col + '),"")';
    var gem = k[2] === 'MINIFS' ? '=IFERROR(AVERAGEIF(' + col + ',">0"),"")' : '=IFERROR(AVERAGE(' + col + '),"")';
    sh.getRange(r, 2).setValue(k[0]);
    sh.getRange(r, 3, 1, 3).setFormulas([['=IFERROR(INDEX(' + col + ',MATCH($C$7,' + D + '$A$2:$A,0)),"")', gem, beste].map(F)])
      .setNumberFormat(k[4]);
    sh.getRange(r, 6).setValue(k[3]).setFontColor('#5B5B74');
  });

  // Grafiek 1: geselecteerd vs. gemiddelde vs. beste per thema
  sh.insertChart(sh.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(sh.getRange('B10:E16'))
    .setNumHeaders(1)
    .setPosition(4, 8, 0, 0)
    .setOption('title', 'Volwassenheid: geselecteerd vs. gemiddelde vs. beste')
    .setOption('width', 760).setOption('height', 380)
    .setOption('legend', { position: 'bottom' })
    .setOption('vAxis', { format: 'percent', minValue: 0, maxValue: 1 })
    .setOption('colors', [BENCH_KLEUREN.geselecteerd, BENCH_KLEUREN.gemiddelde, BENCH_KLEUREN.beste])
    .build());

  // Grafiek 2: ranking (top 20) op volwassenheid
  var n = Math.min(20, b.rijen.length);
  if (n) {
    var data = ss.getSheetByName(TAB_BENCH_DATA);
    sh.insertChart(sh.newChart()
      .setChartType(Charts.ChartType.BAR)
      .addRange(data.getRange(1, 1, n + 1, 1))
      .addRange(data.getRange(1, 5, n + 1, 1))
      .setNumHeaders(1)
      .setPosition(25, 2, 0, 0)
      .setOption('title', 'Ranking volwassenheid (top ' + n + ')')
      .setOption('width', 760).setOption('height', Math.max(260, 40 + n * 26))
      .setOption('legend', { position: 'none' })
      .setOption('hAxis', { format: 'percent', minValue: 0, maxValue: 1 })
      .setOption('colors', [BENCH_KLEUREN.geselecteerd])
      .build());
  }
  ss.setActiveSheet(sh);
  ss.moveActiveSheet(1);
}

/**
 * Welk scheidingsteken gebruiken formules in deze Sheet? Engelstalige Sheets gebruiken een
 * komma (=SUM(1,2)), Nederlandse en veel andere een puntkomma (=SOM(1;2)). Dat hangt af van
 * de landinstelling van de Sheet, dus we proberen het gewoon uit in een hulpcel.
 */
function formuleScheiding_(sh) {
  var test = sh.getRange('Z1');
  test.setFormula('=SUM(1,2)');
  SpreadsheetApp.flush();
  var werkt = test.getValue() === 3;
  test.clearContent();
  return werkt ? ',' : ';';
}

/** Tabblad leegmaken (waarden, opmaak, grafieken) of aanmaken. */
function benchTab_(ss, naam) {
  var sh = ss.getSheetByName(naam) || ss.insertSheet(naam);
  sh.getCharts().forEach(function (c) { sh.removeChart(c); });
  // De keuze op het dashboard bewaren: alleen inhoud en opmaak wissen, de keuzecel blijft staan.
  var keuze = naam === TAB_BENCH ? sh.getRange('C7').getValue() : '';
  sh.clear();
  if (naam === TAB_BENCH && keuze) sh.getRange('C7').setValue(keuze);
  return sh;
}

function telOp_(lijst) {
  var t = {};
  lijst.forEach(function (x) { t[x] = (t[x] || 0) + 1; });
  return Object.keys(t).map(function (k) { return [k, t[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
}

function gemiddelde_(lijst) {
  var g = lijst.filter(function (x) { return typeof x === 'number' && isFinite(x); });
  return g.length ? g.reduce(function (a, b) { return a + b; }, 0) / g.length : 0;
}

function nieuwste_(rijen) {
  return rijen.reduce(function (a, r) { return (r[2] instanceof Date && (!(a[2] instanceof Date) || r[2] > a[2])) ? r : a; }, rijen[0]);
}

function bronNaam_(v) {
  var m = /utm_source=([^;]+)/.exec(String(v || ''));
  return m ? m[1].trim().toLowerCase() : '(direct)';
}

function maandag_(d) {
  var m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

function datumLabel_(d, metTijd) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), metTijd ? 'dd-MM-yyyy HH:mm' : 'dd-MM-yyyy');
}
