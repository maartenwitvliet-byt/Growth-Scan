/**
 * Opslag in de Google Sheet: content (beheer), scans, antwoorden, leads,
 * consultants en de berekende benchmark.
 */

var TABS = {
  domeinen: { naam: 'Domeinen', kolommen: ['id', 'nl', 'en', 'rapport_nl', 'rapport_en', 'kleur', 'volgorde'] },
  subthemas: { naam: 'Subthemas', kolommen: ['id', 'domein', 'nl', 'en', 'volgorde'] },
  functies: { naam: 'Functies', kolommen: ['id', 'nl', 'en', 'beschrijving_nl', 'beschrijving_en', 'inspanning'] },
  stellingen: { naam: 'Stellingen', kolommen: ['id', 'volgorde', 'domein', 'subthema', 'nl', 'en', 'oplossing_nl', 'oplossing_en', 'functie', 'doelscore', 'urenKolom', 'toonAls', 'actief', 'typeformKolom', 'nrExcel', 'opmerkingExcel'] },
  instellingen: { naam: 'Instellingen', kolommen: ['sleutel', 'waarde', 'toelichting'] },
  uren: { naam: 'Urenbenchmark', kolommen: ['kolom', 'vraag', 'gemiddeldUrenPerMaand'] },
  pakketten: { naam: 'Pakketten', kolommen: ['naam', 'inbegrepen', 'prijs', 'prijsExtraStrook'] },
  startpakketten: { naam: 'Startpakketten', kolommen: ['totStroken', 'upGoEssential', 'upGoAdvanced', 'upGoHr'] },
  opties: { naam: 'Opties', kolommen: ['product', 'van', 'tot', 'prijs'] },
  teksten: { naam: 'Teksten', kolommen: ['sleutel', 'nl', 'en'] },
  consultants: { naam: 'Consultants', kolommen: ['email', 'naam', 'rol', 'actief'] },
  scans: { naam: 'Scans', kolommen: ['id', 'aangemaakt', 'gewijzigd', 'modus', 'status', 'consultant', 'taal', 'kantoor', 'contactNaam', 'contactEmail', 'domeinen', 'fte', 'strokenPerMaand', 'score_totaal', 'score_payroll', 'score_hr', 'score_tech', 'score_zelf', 'voordeel_jaar1', 'voordeel_jaar2', 'voordeel_jaar3', 'voordeel_totaal', 'pakket', 'prijsPerMaand', 'slidesUrl', 'pdfUrl', 'hubspotCompanyId', 'hubspotContactId', 'bron', 'inBenchmark', 'json'] },
  antwoorden: { naam: 'Antwoorden', kolommen: ['scanId', 'stellingId', 'domein', 'subthema', 'score', 'datum'] },
  leads: { naam: 'Leads', kolommen: ['datum', 'scanId', 'naam', 'organisatie', 'functie', 'email', 'telefoon', 'toestemming', 'bron', 'hubspotContactId'] },
  benchmark: { naam: 'Benchmark', kolommen: ['niveau', 'id', 'naam', 'gemiddeld', 'beste', 'aantal'] }
};

var CACHE_CONTENT = 'content_v1';
var CACHE_BENCHMARK = 'benchmark_v1';

// ------------------------------------------------------------------
// Spreadsheet
// ------------------------------------------------------------------
function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('De app is nog niet ingericht. Voer eenmalig setup() uit in de Apps Script-editor.');
  return SpreadsheetApp.openById(id);
}

function tab_(key) {
  var def = TABS[key];
  var sh = ss_().getSheetByName(def.naam);
  if (!sh) throw new Error('Tabblad ontbreekt: ' + def.naam);
  return sh;
}

/** Leest een tabblad als lijst objecten (kopregel = sleutels). */
function leesTab_(key) {
  var sh = tab_(key);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var head = values[0].map(function (h) { return String(h).trim(); });
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (row.every(function (v) { return v === '' || v === null; })) continue;
    var obj = {};
    head.forEach(function (h, i) { if (h) obj[h] = row[i]; });
    out.push(obj);
  }
  return out;
}

function schrijfTab_(key, objecten) {
  var def = TABS[key];
  var sh = tab_(key);
  sh.clearContents();
  var rows = [def.kolommen].concat(objecten.map(function (o) {
    return def.kolommen.map(function (k) { return o[k] === undefined || o[k] === null ? '' : o[k]; });
  }));
  sh.getRange(1, 1, rows.length, def.kolommen.length).setValues(rows);
}

function naarGetal_(v) {
  if (typeof v === 'number') return v;
  if (v === '' || v === null || v === undefined) return null;
  var n = parseFloat(String(v).replace(',', '.'));
  return isFinite(n) ? n : null;
}

function naarBool_(v) {
  if (typeof v === 'boolean') return v;
  var s = String(v).toLowerCase().trim();
  return !(s === 'false' || s === 'nee' || s === '0' || s === 'onwaar');
}

// ------------------------------------------------------------------
// Cache (CacheService heeft 100 KB per sleutel: daarom in stukken)
// ------------------------------------------------------------------
function cacheZet_(key, obj, seconden) {
  var cache = CacheService.getScriptCache();
  var json = JSON.stringify(obj);
  var size = 90000;
  var delen = Math.ceil(json.length / size);
  var map = {};
  for (var i = 0; i < delen; i++) map[key + '_' + i] = json.substr(i * size, size);
  map[key + '_n'] = String(delen);
  cache.putAll(map, seconden || 21600);
}

function cacheLees_(key) {
  var cache = CacheService.getScriptCache();
  var n = cache.get(key + '_n');
  if (!n) return null;
  var keys = [];
  for (var i = 0; i < Number(n); i++) keys.push(key + '_' + i);
  var parts = cache.getAll(keys);
  var json = '';
  for (var j = 0; j < keys.length; j++) {
    if (parts[keys[j]] === undefined) return null;
    json += parts[keys[j]];
  }
  try { return JSON.parse(json); } catch (e) { return null; }
}

function cacheWis_(key) {
  var cache = CacheService.getScriptCache();
  var n = cache.get(key + '_n');
  var keys = [key + '_n'];
  for (var i = 0; i < Number(n || 0); i++) keys.push(key + '_' + i);
  cache.removeAll(keys);
}

/** Na een wijziging in de Sheet (installeerbare onEdit-trigger uit setup()). */
function bijWijzigingSheet_(e) {
  cacheWis_(CACHE_CONTENT);
  cacheWis_(CACHE_BENCHMARK);
}

// ------------------------------------------------------------------
// Content
// ------------------------------------------------------------------
function laadContent_() {
  var cached = cacheLees_(CACHE_CONTENT);
  if (cached) return cached;
  var content = leesContentUitSheet_();
  cacheZet_(CACHE_CONTENT, content, 21600);
  return content;
}

function leesContentUitSheet_() {
  var subthemaRijen = leesTab_('subthemas').sort(function (a, b) { return a.volgorde - b.volgorde; });
  var domeinen = leesTab_('domeinen').sort(function (a, b) { return a.volgorde - b.volgorde; }).map(function (d) {
    return {
      id: String(d.id), nl: d.nl, en: d.en, rapport_nl: d.rapport_nl, rapport_en: d.rapport_en, kleur: d.kleur,
      subthemas: subthemaRijen.filter(function (s) { return s.domein === d.id; }).map(function (s) { return String(s.id); })
    };
  });
  var subthemas = {};
  subthemaRijen.forEach(function (s) { subthemas[s.id] = { nl: s.nl, en: s.en, domein: s.domein }; });

  var functies = {};
  leesTab_('functies').forEach(function (f) {
    functies[f.id] = { nl: f.nl, en: f.en, beschrijving_nl: f.beschrijving_nl, beschrijving_en: f.beschrijving_en, inspanning: String(f.inspanning || 'midden').toLowerCase() };
  });

  var stellingen = leesTab_('stellingen').sort(function (a, b) { return a.volgorde - b.volgorde; }).map(function (s) {
    return {
      id: String(s.id), volgorde: naarGetal_(s.volgorde), domein: s.domein, subthema: s.subthema,
      nl: String(s.nl), en: String(s.en || s.nl), oplossing_nl: String(s.oplossing_nl || ''), oplossing_en: String(s.oplossing_en || s.oplossing_nl || ''),
      functie: s.functie, doelscore: naarGetal_(s.doelscore) || 5, urenKolom: s.urenKolom ? String(s.urenKolom) : null,
      toonAls: String(s.toonAls || ''), actief: naarBool_(s.actief)
    };
  });

  var instellingen = {};
  leesTab_('instellingen').forEach(function (r) {
    var v = r.waarde;
    if (typeof v === 'string' && /^[\[{]/.test(v.trim())) { try { v = JSON.parse(v); } catch (e) { /* tekst laten */ } }
    instellingen[r.sleutel] = v;
  });

  var urenbenchmark = {};
  leesTab_('uren').forEach(function (u) { urenbenchmark[u.kolom] = naarGetal_(u.gemiddeldUrenPerMaand) || 0; });

  var opties = leesTab_('opties');
  function staffel(product) {
    return opties.filter(function (o) { return o.product === product; }).map(function (o) {
      var p = naarGetal_(o.prijs);
      return { van: naarGetal_(o.van), tot: naarGetal_(o.tot), prijs: p === null ? String(o.prijs) : p };
    });
  }
  var prijzen = {
    pakketten: leesTab_('pakketten').map(function (p) { return { naam: p.naam, inbegrepen: naarGetal_(p.inbegrepen), prijs: naarGetal_(p.prijs), prijsExtraStrook: naarGetal_(p.prijsExtraStrook) }; }),
    startpakketten: leesTab_('startpakketten').map(function (p) { return { totStroken: p.totStroken, upGoEssential: naarGetal_(p.upGoEssential), upGoAdvanced: naarGetal_(p.upGoAdvanced), upGoHr: naarGetal_(p.upGoHr) }; }),
    perform: staffel('perform'), hire: staffel('hire'), expense: staffel('expense'), pay: staffel('pay'), engage: staffel('engage'),
    hireVacatureAandeel: naarGetal_(instellingen.hireVacatureAandeel) || 0.05
  };

  var teksten = {};
  leesTab_('teksten').forEach(function (t) { if (t.sleutel) teksten[t.sleutel] = { nl: t.nl, en: t.en }; });

  return {
    domeinen: domeinen, subthemas: subthemas, functies: functies, stellingen: stellingen,
    instellingen: instellingen, urenbenchmark: urenbenchmark, prijzen: prijzen, teksten: teksten
  };
}

// ------------------------------------------------------------------
// Consultants
// ------------------------------------------------------------------
function zoekConsultant_(email) {
  var lijst = leesTab_('consultants');
  for (var i = 0; i < lijst.length; i++) {
    var c = lijst[i];
    if (String(c.email).toLowerCase().trim() === email && naarBool_(c.actief)) {
      return { email: email, naam: c.naam || email, rol: String(c.rol || 'consultant').toLowerCase() };
    }
  }
  return null;
}

// ------------------------------------------------------------------
// Scans
// ------------------------------------------------------------------
function zoekScanRij_(id) {
  var sh = tab_('scans');
  var f = sh.getRange('A:A').createTextFinder(String(id)).matchEntireCell(true).findNext();
  return f ? f.getRow() : null;
}

function leesScan_(id) {
  var rij = zoekScanRij_(id);
  if (!rij) return null;
  var sh = tab_('scans');
  var kol = TABS.scans.kolommen.indexOf('json') + 1;
  var json = sh.getRange(rij, kol).getValue();
  return json ? JSON.parse(json) : null;
}

/** Schrijft of vervangt de regel van een scan, met samenvatting voor het dashboard. */
function schrijfScanRij_(scan, analyse) {
  var sc = analyse.scores, bc = analyse.businessCase, pr = analyse.prijs;
  var waarde = {
    id: scan.id, aangemaakt: scan.aangemaakt, gewijzigd: scan.gewijzigd, modus: scan.modus, status: scan.status,
    consultant: scan.consultant || '', taal: scan.taal, kantoor: (scan.kantoor || {}).naam || '',
    contactNaam: (scan.kantoor || {}).contactNaam || '', contactEmail: (scan.kantoor || {}).contactEmail || '',
    domeinen: (scan.domeinen || []).join(', '),
    fte: (scan.kerncijfers || {}).fte || '', strokenPerMaand: (scan.kerncijfers || {}).strokenPerMaand || '',
    score_totaal: rond_(sc.totaal), score_payroll: rond_(sc.domein.payroll), score_hr: rond_(sc.domein.hr),
    score_tech: rond_(sc.domein.tech), score_zelf: rond_(sc.domein.zelf),
    voordeel_jaar1: bc ? Math.round(bc.jaren[0].voordeel) : '', voordeel_jaar2: bc ? Math.round(bc.jaren[1].voordeel) : '',
    voordeel_jaar3: bc ? Math.round(bc.jaren[2].voordeel) : '', voordeel_totaal: bc ? Math.round(bc.totaalVoordeel) : '',
    pakket: pr ? pr.pakket.naam : '', prijsPerMaand: pr ? Math.round(pr.totaalMaand) : '',
    slidesUrl: (scan.rapport || {}).slidesUrl || '', pdfUrl: (scan.rapport || {}).pdfUrl || '',
    hubspotCompanyId: (scan.hubspot || {}).companyId || '', hubspotContactId: (scan.hubspot || {}).contactId || '',
    bron: bronTekst_(scan.bron), inBenchmark: scan.status === 'afgerond' && scan.inBenchmark !== false,
    json: JSON.stringify(scan)
  };
  var rowValues = TABS.scans.kolommen.map(function (k) { return waarde[k] === undefined || waarde[k] === null ? '' : waarde[k]; });
  var sh = tab_('scans');
  var rij = zoekScanRij_(scan.id);
  if (rij) sh.getRange(rij, 1, 1, rowValues.length).setValues([rowValues]);
  else sh.appendRow(rowValues);
}

function rond_(v) { return typeof v === 'number' && isFinite(v) ? Math.round(v * 100) / 100 : ''; }

function bronTekst_(bron) {
  return Object.keys(bron || {}).map(function (k) { return k + '=' + bron[k]; }).join('; ');
}

/** Vervangt de antwoordregels van een scan (één aaneengesloten blok). */
function schrijfAntwoorden_(scan, content) {
  var sh = tab_('antwoorden');
  var kolomA = sh.getRange(1, 1, Math.max(1, sh.getLastRow()), 1).getValues();
  var eerste = -1, aantal = 0;
  for (var r = 0; r < kolomA.length; r++) {
    if (String(kolomA[r][0]) === scan.id) { if (eerste < 0) eerste = r + 1; aantal++; }
  }
  if (eerste > 0 && aantal) sh.deleteRows(eerste, aantal);
  var byId = {};
  content.stellingen.forEach(function (s) { byId[s.id] = s; });
  var datum = new Date();
  var rows = [];
  Object.keys(scan.antwoorden || {}).forEach(function (id) {
    var v = scan.antwoorden[id];
    var s = byId[id];
    if (s && typeof v === 'number' && v >= 1 && v <= 5) rows.push([scan.id, id, s.domein, s.subthema, v, datum]);
  });
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

// ------------------------------------------------------------------
// Benchmark: alle afgeronde scans die meetellen (inclusief de 46 uit de Typeform)
// ------------------------------------------------------------------
function laadBenchmark_(content) {
  var cached = cacheLees_(CACHE_BENCHMARK);
  if (cached) return cached;
  return herberekenBenchmark_(content || laadContent_());
}

function herberekenBenchmark_(content) {
  var scans = tab_('scans').getDataRange().getValues();
  var head = scans[0];
  var iId = head.indexOf('id'), iIn = head.indexOf('inBenchmark'), iF = head.indexOf('fte'), iS = head.indexOf('strokenPerMaand');
  var meta = {};
  for (var r = 1; r < scans.length; r++) {
    if (scans[r][iIn] === true || String(scans[r][iIn]).toUpperCase() === 'TRUE') {
      meta[scans[r][iId]] = { id: scans[r][iId], fte: naarGetal_(scans[r][iF]), strokenPerMaand: naarGetal_(scans[r][iS]), scores: {} };
    }
  }
  var ant = tab_('antwoorden').getDataRange().getValues();
  for (var a = 1; a < ant.length; a++) {
    var m = meta[ant[a][0]];
    var v = naarGetal_(ant[a][4]);
    if (m && v !== null) m.scores[ant[a][1]] = v;
  }
  var responses = Object.keys(meta).map(function (k) { return meta[k]; });
  GSCalc.indexeer(content);
  var bm = GSCalc.benchmark(content, responses, {
    besteMethode: content.instellingen.besteMethode || 'top10',
    besteAandeel: naarGetal_(content.instellingen.besteAandeel) || 0.1
  });
  cacheZet_(CACHE_BENCHMARK, bm, 21600);
  try { schrijfBenchmarkTab_(content, bm); } catch (e) { console.warn('Benchmark-tab niet bijgewerkt: ' + e); }
  return bm;
}

function schrijfBenchmarkTab_(content, bm) {
  var rows = [];
  rows.push({ niveau: 'totaal', id: 'totaal', naam: 'Totaal', gemiddeld: rond_(bm.totaal.gem), beste: rond_(bm.totaal.beste), aantal: bm.n });
  content.domeinen.forEach(function (d) {
    rows.push({ niveau: 'domein', id: d.id, naam: d.nl, gemiddeld: rond_(bm.domein[d.id].gem), beste: rond_(bm.domein[d.id].beste), aantal: bm.n });
    d.subthemas.forEach(function (s) {
      rows.push({ niveau: 'subthema', id: s, naam: content.subthemas[s].nl, gemiddeld: rond_(bm.subthema[s].gem), beste: rond_(bm.subthema[s].beste), aantal: bm.n });
    });
  });
  content.stellingen.forEach(function (s) {
    var b = bm.stelling[s.id];
    rows.push({ niveau: 'stelling', id: s.id, naam: s.nl, gemiddeld: rond_(b.gem), beste: b.beste, aantal: b.n });
  });
  rows.push({ niveau: 'stroken per FTE', id: 'strokenPerFte', naam: 'Gemiddeld aantal stroken per FTE per maand', gemiddeld: Math.round(bm.strokenPerFte.gemiddeld || 0), beste: '', aantal: bm.strokenPerFte.n });
  schrijfTab_('benchmark', rows);
}
