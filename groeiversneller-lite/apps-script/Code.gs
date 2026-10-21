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
 *   - Campagnelinks: zet utm-parameters achter de web-app-URL, bijvoorbeeld
 *     .../exec?utm_source=linkedin&utm_medium=social&utm_campaign=meer-tijd
 *     De bron komt mee in de tabbladen Sessies en Leads.
 *
 * Tabbladen in de Sheet:
 *   Lite - Leads       - een regel per prospect die zijn gegevens heeft achtergelaten (voor opvolging).
 *                 De kolommen "Opvolgstatus", "Eigenaar" en "Notities" zijn voor sales en
 *                 worden door de app nooit overschreven.
 *   Lite - Sessies     - een regel per ingevulde scan, ook zonder gegevens (handig om afhakers te zien).
 *   Lite - Pijnpunten  - een regel per gevonden pijnpunt, handig voor analyses over prospects heen.
 */

/** Naam van het HTML-hoofdbestand in dit project (zonder ".html"). */
var HTML_BESTAND = 'index';

/**
 * De HTML-bestanden van de app, met een tekst die aan het eind van elk bestand staat.
 * Let op: geen HTML-commentaar gebruiken, want dat laat Apps Script weg bij het inlezen.
 */
var HTML_DELEN = {
  index: '</body>',
  stijl: 'einde:stijl',
  beeld: 'einde:beeld',
  data: 'einde:data',
  app: 'einde:app'
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
var TAB_LEADS = 'Lite - Leads';
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
  var probleem = controleerIndex_();
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

/** Geeft een omschrijving van het eerste probleem terug, of '' als alle HTML-bestanden in orde zijn. */
function controleerIndex_() {
  var namen = Object.keys(HTML_DELEN);
  for (var i = 0; i < namen.length; i++) {
    var p = controleerDeel_(namen[i]);
    if (p) return p;
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
  Logger.log('Leads en sessies worden bewaard in: ' + ss.getUrl());
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
    var leads = tab_(ss, TAB_LEADS, KOLOMMEN_LEADS);
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
  return schoon;
}

function stuurMelding_(lead, data) {
  if (!NOTIFICATIE_EMAIL) return;
  try {
    var biz = data.businessCase || {};
    var regels = [
      'Nieuwe lead uit de Groeiversneller Lite:',
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
      subject: 'Nieuwe lead Groeiversneller: ' + lead.bedrijf + ' (' + lead.naam + ')',
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
    if (naam === TAB_LEADS) {
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
