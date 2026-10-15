/**
 * Groeiversneller (Nmbrs) - Google Apps Script web-app
 *
 * Dit project bestaat uit twee bestanden:
 *   1. Code.gs     - dit bestand: serveert de app en bewaart sessies in een Google Sheet.
 *   2. index.html  - de app, in de lichte versie voor Apps Script
 *                    (groei-versneller/apps-script/index.html uit de repository).
 *                    Maak in de Apps Script-editor een HTML-bestand met de naam "index"
 *                    en plak daar de volledige inhoud van index.html in.
 *
 * Wit scherm of foutmelding? Kies bovenin de functie "diagnose" en klik op Uitvoeren;
 * het Uitvoeringslogboek vertelt wat er mis is.
 *
 * Eenmalig instellen:
 *   - Kies bovenin de functie "setup" en klik op Uitvoeren. Geef toestemming.
 *     Er wordt een Google Sheet "Groeiversneller - Sessies" in je Drive aangemaakt;
 *     de link staat daarna in het Uitvoeringslogboek.
 *   - Publiceren: Implementeren > Nieuwe implementatie > Type: Web-app,
 *     "Uitvoeren als: Ik". Alle sessies komen dan in jouw Sheet terecht.
 *
 * Tabbladen in de Sheet:
 *   Sessies     - een regel per klantsessie (wordt bijgewerkt zolang de sessie loopt)
 *   Pijnpunten  - een regel per gevonden pijnpunt, handig voor analyses over klanten heen
 */

/** Naam van het HTML-bestand in dit project (zonder ".html"). */
var HTML_BESTAND = 'index';

/** Naam van de Sheet die automatisch wordt aangemaakt. */
var SHEET_NAAM = 'Groeiversneller - Sessies';

/** Optioneel: ID van een bestaande Sheet. Leeg laten = automatisch aanmaken. */
var SPREADSHEET_ID = '';

var TAB_SESSIES = 'Sessies';
var TAB_PIJNPUNTEN = 'Pijnpunten';

var KOLOMMEN_SESSIES = [
  'Sessie-ID', 'Klant', 'Gestart', 'Laatst bijgewerkt', 'Ingevuld door', 'Laatste stap',
  'Groeipotentieel', 'Pijnpunten', 'Geprioriteerd', 'Quick wins', 'Grote projecten',
  'Nice to have', 'Heroverwegen', 'Uren per week', 'Uurtarief', 'Kosten per jaar',
  'Kosten per maand', 'Eerste stap', 'Gewenste startdatum', 'Thema met meeste pijn',
  'Quick wins (titels)', 'Grote projecten (titels)', 'Nmbrs-functionaliteiten', 'Back-up (JSON)'
];

var KOLOMMEN_PIJNPUNTEN = [
  'Sessie-ID', 'Klant', 'Laatst bijgewerkt', 'Thema', 'Pijnpunt', 'Kwadrant', 'Nmbrs-functionaliteiten'
];

/**
 * Wordt aangeroepen wanneer iemand de URL van de web-app opent.
 * @return {HtmlOutput} De Groeiversneller.
 */
function doGet() {
  var probleem = controleerIndex_();
  if (probleem) return foutpagina_(probleem);
  return HtmlService.createHtmlOutputFromFile(HTML_BESTAND)
    .setTitle('Groeiversneller | Nmbrs')
    // Nodig voor een goede weergave op tablet en telefoon.
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    // Wil je de app insluiten in Google Sites of een andere website?
    // Haal dan de twee schuine strepen voor de volgende regel weg.
    // .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    ;
}

/**
 * Uitvoeren vanuit de editor als de web-app niet goed laadt: controleert of
 * index.html compleet is en of de Sheet bereikbaar is. Zie het Uitvoeringslogboek.
 */
function diagnose() {
  var probleem = controleerIndex_();
  Logger.log(probleem ? 'PROBLEEM met index.html: ' + probleem : 'index.html is compleet (' + indexLengte_() + ' tekens).');
  try {
    Logger.log('Sheet bereikbaar: ' + openSpreadsheet_().getUrl());
  } catch (e) {
    Logger.log('Sheet niet bereikbaar: ' + e.message + ' (voer "setup" uit).');
  }
  Logger.log('Tip: test de web-app in een incognitovenster als je met meerdere Google-accounts bent ingelogd.');
}

/** Geeft een omschrijving van het probleem terug, of '' als index.html in orde is. */
function controleerIndex_() {
  var inhoud;
  try {
    inhoud = HtmlService.createHtmlOutputFromFile(HTML_BESTAND).getContent();
  } catch (e) {
    return 'er is geen HTML-bestand met de naam "' + HTML_BESTAND + '" gevonden. ' +
      'Maak via Bestanden + HTML een bestand met precies die naam en plak daar index.html in.';
  }
  if (inhoud.indexOf('groeiversneller:einde') === -1) {
    return 'index.html lijkt niet volledig geplakt (' + inhoud.length + ' tekens gevonden). ' +
      'Open index.html opnieuw, selecteer alles, kopieer, en plak het in het bestand "' + HTML_BESTAND + '". ' +
      'Sla op en maak daarna een nieuwe versie van de implementatie.';
  }
  return '';
}

function indexLengte_() {
  try { return HtmlService.createHtmlOutputFromFile(HTML_BESTAND).getContent().length; } catch (e) { return 0; }
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
  Logger.log('Sessies worden bewaard in: ' + ss.getUrl());
  return ss.getUrl();
}

/**
 * Wordt vanuit de app aangeroepen (google.script.run.bewaarSessie) na elke wijziging.
 * Werkt de regel van deze sessie bij, of voegt hem toe als hij nog niet bestaat.
 * @param {Object} data Samenvatting van de sessie, opgebouwd in index.html.
 * @return {{ok: boolean, bijgewerkt: string}}
 */
function bewaarSessie(data) {
  if (!data || typeof data !== 'object') throw new Error('Geen sessiegegevens ontvangen.');
  var id = String(data.sessieId || '').trim();
  if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) throw new Error('Ongeldige sessie-ID.');

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = openSpreadsheet_();
    var nu = new Date();
    var door = ingelogdeGebruiker_();

    // --- Sessies: een regel per sessie (bijwerken of toevoegen) ---
    var sessies = tab_(ss, TAB_SESSIES, KOLOMMEN_SESSIES);
    var rij = zoekRij_(sessies, id);
    var gestart = rij ? sessies.getRange(rij, 3).getValue() : (parseDatum_(data.gestart) || nu);
    var vorigeDoor = rij ? sessies.getRange(rij, 5).getValue() : '';

    var biz = data.businessCase || {};
    var waarden = [
      id,
      tekst_(data.klant),
      gestart,
      nu,
      door || vorigeDoor,
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

/* ------------------------------------------------------------------ */
/* Hulpfuncties                                                         */
/* ------------------------------------------------------------------ */

function openSpreadsheet_() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) { /* verwijderd: opnieuw aanmaken */ }
  }
  var ss = SpreadsheetApp.create(SHEET_NAAM);
  tab_(ss, TAB_SESSIES, KOLOMMEN_SESSIES);
  tab_(ss, TAB_PIJNPUNTEN, KOLOMMEN_PIJNPUNTEN);
  var standaard = ss.getSheetByName('Sheet1') || ss.getSheetByName('Blad1');
  if (standaard && ss.getSheets().length > 1) ss.deleteSheet(standaard);
  props.setProperty('SPREADSHEET_ID', ss.getId());
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
    if (naam === TAB_SESSIES) {
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

function ingelogdeGebruiker_() {
  try { return Session.getActiveUser().getEmail() || ''; } catch (e) { return ''; }
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
