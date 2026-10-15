/**
 * Groeiversneller (Nmbrs) - Google Apps Script web-app
 *
 * Dit project bestaat uit twee bestanden:
 *   1. Code.gs     - dit bestand: serveert de app als webpagina.
 *   2. index.html  - de complete app (groei-versneller/index.html uit de repository).
 *                    Maak in de Apps Script-editor een HTML-bestand met de naam "index"
 *                    en plak daar de volledige inhoud van index.html in.
 *
 * Publiceren: Implementeren > Nieuwe implementatie > Type: Web-app.
 * Alle sessiegegevens blijven in de browser van de gebruiker; dit script slaat
 * niets op en vraagt geen toegang tot Drive, Gmail of andere gegevens.
 */

/** Naam van het HTML-bestand in dit project (zonder ".html"). */
var HTML_BESTAND = 'index';

/**
 * Wordt aangeroepen wanneer iemand de URL van de web-app opent.
 * @return {HtmlOutput} De Groeiversneller.
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile(HTML_BESTAND)
    .setTitle('Groeiversneller | Nmbrs')
    // Nodig voor een goede weergave op tablet en telefoon.
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    // Wil je de app insluiten in Google Sites of een andere website?
    // Haal dan de twee schuine strepen voor de volgende regel weg.
    // .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    ;
}
