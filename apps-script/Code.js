/**
 * Nmbrs Groei Scan: web-app.
 *
 * Eén project, twee deployments:
 *   - Begeleide modus: toegang "Iedereen binnen visma.com". Consultants loggen in
 *     met hun Google-account en moeten in het tabblad Consultants staan.
 *   - Campagnemodus: toegang "Iedereen". Link met ?modus=campagne.
 * Beide draaien als de eigenaar (sales.nmbrs@visma.com), zodat alleen de
 * eigenaar toegang nodig heeft tot de Sheet, de Slides en de Drive-map.
 */

var APP_TITEL = 'Nmbrs Groei Scan';

function doGet(e) {
  try {
    return bouwPagina_(e);
  } catch (err) {
    console.error(err);
    return HtmlService.createHtmlOutput(
      '<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:80px auto;padding:0 20px;color:#00001D">' +
      '<h1 style="font-size:28px">De Groei Scan is even niet beschikbaar</h1>' +
      '<p style="color:#3A3A55;line-height:1.5">' + String(err && err.message || err).replace(/</g, '&lt;') + '</p></div>'
    ).setTitle(APP_TITEL);
  }
}

function bouwPagina_(e) {
  var params = (e && e.parameter) || {};
  var ctx = huidigeContext_(params);
  var content = laadContent_();
  var boot = {
    ctx: ctx,
    content: content,
    benchmark: laadBenchmark_(content),
    scanId: params.scan || null,
    bron: bronUitParams_(params)
  };
  var tpl = HtmlService.createTemplateFromFile('Index');
  tpl.bootJson = JSON.stringify(boot).replace(/</g, '\\u003c');
  return tpl.evaluate()
    .setTitle(APP_TITEL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setFaviconUrl('https://www.nmbrs.com/favicon.ico')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Voor <?!= include('Bestand') ?> in de HTML-templates. */
function include(naam) {
  return HtmlService.createHtmlOutputFromFile(naam).getContent();
}

/**
 * Bepaalt modus en gebruiker. De begeleide modus vereist een ingelogde
 * consultant uit het tabblad Consultants; anders altijd campagnemodus.
 */
function huidigeContext_(params) {
  var email = '';
  try { email = (Session.getActiveUser().getEmail() || '').toLowerCase(); } catch (err) { email = ''; }
  var consultant = email ? zoekConsultant_(email) : null;
  var wilCampagne = String(params.modus || '').toLowerCase() === 'campagne';
  var modus = (consultant && !wilCampagne) ? 'begeleid' : 'campagne';
  var taalParam = String(params.taal || params.lang || '').toLowerCase();
  var taal = taalParam === 'en' ? 'en' : 'nl';
  return {
    modus: modus,
    taal: taal,
    taalExpliciet: !!taalParam,
    gebruiker: modus === 'begeleid' ? consultant : null,
    appUrl: ScriptApp.getService().getUrl(),
    versie: 1
  };
}

function bronUitParams_(params) {
  var bron = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref'].forEach(function (k) {
    if (params[k]) bron[k] = String(params[k]).slice(0, 100);
  });
  return bron;
}

/** Gooit een fout als de huidige gebruiker geen actieve consultant is. */
function vereisConsultant_() {
  var email = '';
  try { email = (Session.getActiveUser().getEmail() || '').toLowerCase(); } catch (err) { email = ''; }
  var c = email ? zoekConsultant_(email) : null;
  if (!c) throw new Error('Geen toegang: log in met een Nmbrs-account dat in het tabblad Consultants staat.');
  return c;
}
