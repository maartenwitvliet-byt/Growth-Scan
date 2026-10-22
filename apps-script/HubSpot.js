/**
 * HubSpot-koppeling via een private app.
 * Token in Script Properties: HUBSPOT_TOKEN.
 * Benodigde scopes: crm.objects.companies.read/write, crm.objects.contacts.read/write.
 *
 * Per scan: bedrijf zoeken of aanmaken, contact zoeken of aanmaken, koppelen,
 * en een notitie met scores, besparing en rapportlinks. Er wordt geen deal aangemaakt.
 */

var HUBSPOT_API = 'https://api.hubapi.com';

function hubspotToken_() {
  return PropertiesService.getScriptProperties().getProperty('HUBSPOT_TOKEN');
}

function hubspot_(methode, pad, body) {
  var token = hubspotToken_();
  if (!token) throw new Error('HubSpot is nog niet gekoppeld (Script Property HUBSPOT_TOKEN ontbreekt).');
  var opts = {
    method: methode,
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  };
  if (body) opts.payload = JSON.stringify(body);
  for (var poging = 0; poging < 3; poging++) {
    var res = UrlFetchApp.fetch(HUBSPOT_API + pad, opts);
    var code = res.getResponseCode();
    if (code === 429 || code >= 500) { Utilities.sleep(800 * (poging + 1)); continue; }
    var text = res.getContentText();
    var json = text ? JSON.parse(text) : {};
    if (code >= 300) throw new Error('HubSpot ' + code + ': ' + (json.message || text).slice(0, 300));
    return json;
  }
  throw new Error('HubSpot reageert niet; probeer het later opnieuw.');
}

function hubspotZoekBedrijven_(zoekterm) {
  if (!zoekterm) return [];
  var res = hubspot_('post', '/crm/v3/objects/companies/search', {
    query: zoekterm,
    limit: 8,
    properties: ['name', 'domain', 'city']
  });
  return (res.results || []).map(function (r) {
    return { id: r.id, naam: r.properties.name, domein: r.properties.domain, plaats: r.properties.city };
  });
}

function hubspotZoek_(object, eigenschap, waarde) {
  if (!waarde) return null;
  var res = hubspot_('post', '/crm/v3/objects/' + object + '/search', {
    filterGroups: [{ filters: [{ propertyName: eigenschap, operator: 'EQ', value: waarde }] }],
    limit: 1
  });
  return res.results && res.results[0] ? res.results[0].id : null;
}

function domeinVan_(website, email) {
  var w = String(website || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  if (w && w.indexOf('.') > 0) return w;
  var e = String(email || '').toLowerCase().split('@')[1] || '';
  var publiek = ['gmail.com', 'hotmail.com', 'outlook.com', 'live.nl', 'hotmail.nl', 'icloud.com', 'yahoo.com', 'ziggo.nl', 'kpnmail.nl'];
  return e && publiek.indexOf(e) < 0 ? e : '';
}

function hubspotSyncScan_(scan) {
  var k = scan.kantoor || {};
  var lead = scan.lead || {};
  var email = (lead.email || k.contactEmail || '').toLowerCase();
  var domein = domeinVan_(k.website, email);

  // Bedrijf
  var companyId = k.hubspotCompanyId || (scan.hubspot && scan.hubspot.companyId) || null;
  if (!companyId && domein) companyId = hubspotZoek_('companies', 'domain', domein);
  if (!companyId && k.naam) companyId = hubspotZoek_('companies', 'name', k.naam);
  if (!companyId && k.naam) {
    var props = { name: k.naam };
    if (domein) props.domain = domein;
    companyId = hubspot_('post', '/crm/v3/objects/companies', { properties: props }).id;
  }

  // Contact
  var contactId = null;
  if (email) {
    contactId = hubspotZoek_('contacts', 'email', email);
    var naam = String(lead.naam || k.contactNaam || '').trim();
    var delen = naam.split(/\s+/);
    var cprops = { email: email };
    if (naam) { cprops.firstname = delen[0]; if (delen.length > 1) cprops.lastname = delen.slice(1).join(' '); }
    if (lead.telefoon || k.contactTelefoon) cprops.phone = lead.telefoon || k.contactTelefoon;
    if (lead.functie) cprops.jobtitle = lead.functie;
    if (contactId) hubspot_('patch', '/crm/v3/objects/contacts/' + contactId, { properties: cprops });
    else contactId = hubspot_('post', '/crm/v3/objects/contacts', { properties: cprops }).id;
    if (companyId) hubspot_('put', '/crm/v4/objects/contacts/' + contactId + '/associations/default/companies/' + companyId);
  }

  // Notitie met de uitkomsten
  var content = GSCalc.indexeer(laadContent_());
  var analyse = GSCalc.analyse(content, scan, laadBenchmark_(content));
  var associaties = [];
  if (companyId) associaties.push({ to: { id: companyId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 190 }] });
  if (contactId) associaties.push({ to: { id: contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }] });
  var note = hubspot_('post', '/crm/v3/objects/notes', {
    properties: { hs_timestamp: new Date().toISOString(), hs_note_body: hubspotNotitie_(scan, analyse, content) },
    associations: associaties
  });
  return { companyId: companyId, contactId: contactId, noteId: note.id };
}

function hubspotNotitie_(scan, a, content) {
  function f(v) { return typeof v === 'number' && isFinite(v) ? v.toFixed(1).replace('.', ',') : '–'; }
  function eur(v) { return typeof v === 'number' ? '€ ' + Math.round(v).toLocaleString('nl-NL') : '–'; }
  var regels = [];
  regels.push('<p><strong>Nmbrs Groei Scan</strong> (' + (scan.modus === 'begeleid' ? 'begeleid door ' + scan.consultant : 'campagne') + ')</p>');
  regels.push('<p>Totaalscore: <strong>' + f(a.scores.totaal) + '</strong> van 5</p><ul>');
  (scan.domeinen || []).forEach(function (d) {
    var dom = content.domeinById[d];
    var bm = a.benchmark && a.benchmark.domein[d];
    regels.push('<li>' + dom.nl + ': ' + f(a.scores.domein[d]) + (bm ? ' (gemiddeld ' + f(bm.gem) + ')' : '') + '</li>');
  });
  regels.push('</ul>');
  if (a.businessCase && a.businessCase.totaalVoordeel) {
    regels.push('<p>Voordeel over 3 jaar: <strong>' + eur(a.businessCase.totaalVoordeel) + '</strong> (jaar 1 ' + eur(a.businessCase.jaren[0].voordeel) + ', jaar 2 ' + eur(a.businessCase.jaren[1].voordeel) + ', jaar 3 ' + eur(a.businessCase.jaren[2].voordeel) + ')</p>');
  }
  if (a.kansen && a.kansen.length) {
    regels.push('<p>Grootste kansen: ' + a.kansen.map(function (k) { return content.functies[k.functie].nl; }).join(', ') + '</p>');
  }
  if (a.prijs) regels.push('<p>Pakketadvies: ' + a.prijs.pakket.naam + ' (' + eur(a.prijs.totaalMaand) + ' per maand)</p>');
  if (scan.kerncijfers && scan.kerncijfers.strokenPerMaand) regels.push('<p>Stroken per maand: ' + scan.kerncijfers.strokenPerMaand + ', FTE salarisadministratie: ' + (scan.kerncijfers.fte || '–') + '</p>');
  var r = scan.rapport || {};
  if (r.slidesUrl) regels.push('<p><a href="' + r.slidesUrl + '">Rapport in Google Slides</a></p>');
  if (r.pdfUrl) regels.push('<p><a href="' + r.pdfUrl + '">Rapport als PDF</a></p>');
  if (scan.bron && Object.keys(scan.bron).length) regels.push('<p>Bron: ' + bronTekst_(scan.bron) + '</p>');
  regels.push('<p>Scan-ID: ' + scan.id + '</p>');
  return regels.join('');
}
