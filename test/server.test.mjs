// Draait de echte Apps Script-serverbestanden in Node, met nagebootste Google-diensten.
// Test: setup(), opslaan en afronden van scans, benchmark, toegangsregels, leads en HubSpot.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';

// ---------------- Nagebootste Google-diensten ----------------
class Range {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
  getValues() {
    const out = [];
    for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) row.push(this.sh.cel(this.r + i, this.c + j)); out.push(row); }
    return out;
  }
  getValue() { return this.sh.cel(this.r, this.c); }
  setValues(v) { v.forEach((row, i) => row.forEach((x, j) => this.sh.zet(this.r + i, this.c + j, x))); return this; }
  setFontWeight() { return this; } setBackground() { return this; } setFontSize() { return this; } setNumberFormat() { return this; }
  createTextFinder(tekst) {
    const sh = this.sh;
    return { matchEntireCell() { return this; }, findNext() {
      for (let i = 1; i <= sh.rows.length; i++) if (String(sh.cel(i, 1)) === tekst) return { getRow: () => i };
      return null;
    } };
  }
}
class Sheet {
  constructor(naam) { this.naam = naam; this.rows = []; }
  cel(r, c) { const v = (this.rows[r - 1] || [])[c - 1]; return v === undefined ? '' : v; }
  zet(r, c, v) { while (this.rows.length < r) this.rows.push([]); this.rows[r - 1][c - 1] = v; }
  getLastRow() { let n = this.rows.length; while (n && this.rows[n - 1].every((x) => x === '' || x === undefined)) n--; return n; }
  getRange(a, b, c, d) {
    if (typeof a === 'string') { if (a === 'A:A') return new Range(this, 1, 1, Math.max(1, this.rows.length), 1); const m = a.match(/^([A-Z])(\d+)(?::([A-Z])(\d+))?$/); const col = (x) => x.charCodeAt(0) - 64; return new Range(this, +m[2], col(m[1]), m[4] ? m[4] - m[2] + 1 : 1, m[3] ? col(m[3]) - col(m[1]) + 1 : 1); }
    return new Range(this, a, b, c || 1, d || 1);
  }
  getDataRange() { const nc = Math.max(1, ...this.rows.map((r) => r.length)); return new Range(this, 1, 1, Math.max(1, this.getLastRow()), nc); }
  appendRow(v) { this.rows.splice(this.getLastRow(), 0, v.slice()); }
  deleteRows(start, n) { this.rows.splice(start - 1, n); }
  clearContents() { this.rows = []; } clear() { this.rows = []; }
  setFrozenRows() {} setColumnWidth() {}
}
class Spreadsheet {
  constructor() { this.sheets = [new Sheet('Sheet1')]; }
  getId() { return 'SS1'; } getUrl() { return 'https://sheet'; }
  getSheetByName(n) { return this.sheets.find((s) => s.naam === n) || null; }
  insertSheet(n) { const s = new Sheet(n); this.sheets.push(s); return s; }
  getSheets() { return this.sheets; }
  deleteSheet(s) { this.sheets = this.sheets.filter((x) => x !== s); }
}

function maakOmgeving() {
  const ss = new Spreadsheet();
  const props = {};
  const cache = new Map();
  const fetches = [];
  const ctx = {
    console, Logger: { log() {} }, JSON, Math, Date, Object, Array, String, Number, Boolean, RegExp, Error, isFinite, parseFloat, parseInt, encodeURIComponent,
    __gebruiker: '',
    SpreadsheetApp: { create: () => ss, openById: () => ss, getActive: () => ({ toast() {} }), getUi: () => ({}) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] ?? null, setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({
      get: (k) => cache.get(k) ?? null,
      getAll: (ks) => Object.fromEntries(ks.filter((k) => cache.has(k)).map((k) => [k, cache.get(k)])),
      putAll: (m) => Object.entries(m).forEach(([k, v]) => { if (String(v).length > 100000) throw new Error('cache-waarde te groot'); cache.set(k, v); }),
      removeAll: (ks) => ks.forEach((k) => cache.delete(k)),
    }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Session: { getActiveUser: () => ({ getEmail: () => ctx.__gebruiker }), getEffectiveUser: () => ({ getEmail: () => 'sales.nmbrs@visma.com' }) },
    Utilities: { getUuid: () => randomUUID(), formatDate: () => '261022', sleep() {}, newBlob: () => ({}), base64Decode: () => [] },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script/exec' }), getProjectTriggers: () => [], newTrigger: () => ({ forSpreadsheet: () => ({ onEdit: () => ({ create() {} }), onOpen: () => ({ create() {} }) }) }), deleteTrigger() {} },
    DriveApp: { createFolder: () => ({ getId: () => 'MAP1' }), getFolderById: () => ({}) },
    HtmlService: {},
    UrlFetchApp: { fetch: (url, opts) => {
      fetches.push({ url, opts, body: opts.payload ? JSON.parse(opts.payload) : null });
      let res = {};
      if (url.includes('/search')) res = { results: [] };
      else if (url.includes('/objects/companies')) res = { id: 'C1' };
      else if (url.includes('/objects/contacts')) res = { id: 'P1' };
      else if (url.includes('/objects/notes')) res = { id: 'N1' };
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify(res) };
    } },
  };
  vm.createContext(ctx);
  for (const f of ['Calc', 'Seed', 'Teksten', 'Store', 'Code', 'Api', 'HubSpot', 'Slides', 'Setup']) {
    vm.runInContext(readFileSync(new URL(`../apps-script/${f}.js`, import.meta.url), 'utf8'), ctx, { filename: f + '.js' });
  }
  return { ctx, ss, props, fetches };
}

const env = maakOmgeving();
const { ctx, ss, props, fetches } = env;
const kolom = (sh, naam) => sh.rows[0].indexOf(naam);

test('setup() maakt alle tabbladen en importeert content en benchmark', () => {
  ctx.setup();
  for (const naam of ['Stellingen', 'Instellingen', 'Scans', 'Antwoorden', 'Benchmark', 'Dashboard', 'Consultants', 'Teksten', 'Pakketten', 'Opties']) assert.ok(ss.getSheetByName(naam), naam);
  assert.equal(ss.getSheetByName('Stellingen').getLastRow(), 83);
  assert.equal(ss.getSheetByName('Scans').getLastRow(), 47);
  assert.ok(ss.getSheetByName('Antwoorden').getLastRow() > 46 * 60);
  assert.equal(props.SPREADSHEET_ID, 'SS1');
  assert.equal(ss.getSheetByName('Consultants').cel(2, 1), 'sales.nmbrs@visma.com');
  const bm = ss.getSheetByName('Benchmark');
  const totaal = bm.rows.find((r) => r[0] === 'totaal');
  assert.equal(totaal[5], 46);
});

test('content uit de Sheet is gelijk aan de startdata', () => {
  const c = ctx.leesContentUitSheet_();
  assert.equal(c.stellingen.length, 82);
  assert.deepEqual(c.instellingen.efficiencyMetNmbrs, [0.2, 0.4, 0.8]);
  assert.equal(c.prijzen.pakketten.length, 8);
  assert.equal(c.prijzen.perform.at(-1).prijs, 'P.O.A.');
  assert.equal(c.domeinen[0].subthemas.length, 3);
  // Rekenmodel op Sheet-content geeft dezelfde uitkomst als de Excel.
  ctx.GSCalc.indexeer(c);
  const tf46 = ctx.SEED.responses.at(-1);
  const bc = ctx.GSCalc.businessCasePayroll(c, tf46.scores, { fte: 3.5, strokenPerMaand: 1200 }, c.instellingen);
  assert.ok(Math.abs(bc.jaren[0].voordeel - 11582.75) < 0.01);
});

test('begeleide modus: alleen consultants uit het tabblad mogen opslaan', () => {
  ctx.__gebruiker = 'onbekend@visma.com';
  assert.throws(() => ctx.api_scanOpslaan({ modus: 'begeleid', antwoorden: { P01: 2 }, domeinen: ['payroll'] }), /Geen toegang/);
  ctx.__gebruiker = 'sales.nmbrs@visma.com';
  const res = ctx.api_scanOpslaan({ modus: 'begeleid', kantoor: { naam: 'Test BV' }, antwoorden: { P01: 2, P02: 9, X99: 3 }, domeinen: ['payroll', 'onzin'], kerncijfers: { fte: 2, strokenPerMaand: 800 } });
  assert.match(res.id, /^GS-/);
  const scan = ctx.leesScan_(res.id);
  assert.deepEqual(scan.antwoorden, { P01: 2 }); // ongeldige score en id weggefilterd
  assert.deepEqual(scan.domeinen, ['payroll']);
  assert.equal(scan.consultant, 'sales.nmbrs@visma.com');
});

test('afronden zet de antwoorden in de benchmark (47 kantoren)', () => {
  ctx.__gebruiker = 'sales.nmbrs@visma.com';
  const antwoorden = Object.fromEntries(ctx.SEED.stellingen.map((s) => [s.id, 3]));
  const res = ctx.api_scanAfronden({ modus: 'begeleid', kantoor: { naam: 'Afgerond BV' }, antwoorden, domeinen: ['payroll', 'hr', 'tech', 'zelf'], kerncijfers: { fte: 4, strokenPerMaand: 2000 } });
  assert.equal(res.benchmark.n, 47);
  const sh = ss.getSheetByName('Scans');
  const rij = sh.rows.find((r) => r[0] === res.id);
  assert.equal(rij[kolom(sh, 'status')], 'afgerond');
  assert.equal(rij[kolom(sh, 'inBenchmark')], true);
  // Opnieuw afronden vervangt de antwoorden in plaats van ze te verdubbelen.
  const aantal = ss.getSheetByName('Antwoorden').rows.filter((r) => r[0] === res.id).length;
  ctx.api_scanAfronden({ id: res.id, modus: 'begeleid', kantoor: { naam: 'Afgerond BV' }, antwoorden, domeinen: ['payroll', 'hr', 'tech', 'zelf'], kerncijfers: { fte: 4, strokenPerMaand: 2000 } });
  assert.equal(ss.getSheetByName('Antwoorden').rows.filter((r) => r[0] === res.id).length, aantal);
  assert.equal(aantal, 82);
});

test('campagne: een scan is alleen met de geheime sleutel bij te werken', () => {
  ctx.__gebruiker = '';
  const res = ctx.api_scanOpslaan({ modus: 'campagne', kantoor: { naam: 'Prospect' }, antwoorden: { P01: 1 }, domeinen: ['payroll'] });
  assert.match(res.id, /^GC-/);
  assert.ok(res.sleutel);
  assert.throws(() => ctx.api_scanOpslaan({ id: res.id, modus: 'campagne', antwoorden: { P01: 5 }, domeinen: ['payroll'] }), /Geen toegang/);
  ctx.api_scanOpslaan({ id: res.id, sleutel: res.sleutel, modus: 'campagne', antwoorden: { P01: 5 }, domeinen: ['payroll'] });
  assert.equal(ctx.leesScan_(res.id).antwoorden.P01, 5);
  // Een campagnebezoeker kan geen begeleide scan openen.
  assert.throws(() => ctx.api_mijnScans(), /Geen toegang/);
});

test('lead: opgeslagen in Leads, scan afgerond en naar HubSpot (zonder deal)', () => {
  ctx.__gebruiker = '';
  props.HUBSPOT_TOKEN = 'pat-test';
  fetches.length = 0;
  const res = ctx.api_scanOpslaan({ modus: 'campagne', kantoor: { naam: 'Lead BV' }, antwoorden: { P01: 2, H01: 3 }, domeinen: ['payroll', 'hr'], bron: { utm_source: 'linkedin' } });
  const out = ctx.api_leadOpslaan({ id: res.id, sleutel: res.sleutel, modus: 'campagne', kantoor: { naam: 'Lead BV' }, antwoorden: { P01: 2, H01: 3 }, domeinen: ['payroll', 'hr'], bron: { utm_source: 'linkedin' } },
    { naam: 'Jan Jansen', organisatie: 'Lead BV', email: 'Jan@LeadBV.nl', telefoon: '0612345678', toestemming: true });
  assert.equal(out.ok, true);
  const leads = ss.getSheetByName('Leads');
  const lead = leads.rows.at(-1);
  assert.equal(lead[5], 'jan@leadbv.nl');
  assert.equal(lead[8], 'utm_source=linkedin');
  assert.equal(lead[9], 'P1');
  const urls = fetches.map((f) => f.url);
  assert.ok(urls.some((u) => u.endsWith('/crm/v3/objects/companies')), 'bedrijf aangemaakt');
  assert.ok(urls.some((u) => u.endsWith('/crm/v3/objects/contacts')), 'contact aangemaakt');
  assert.ok(urls.some((u) => u.endsWith('/crm/v3/objects/notes')), 'notitie aangemaakt');
  assert.ok(!urls.some((u) => u.includes('deals')), 'geen deal');
  const domeinZoek = fetches.find((f) => f.url.includes('companies/search'));
  assert.equal(domeinZoek.body.filterGroups[0].filters[0].value, 'leadbv.nl');
  const note = fetches.find((f) => f.url.endsWith('/notes')).body;
  assert.match(note.properties.hs_note_body, /Totaalscore/);
});

test('lead zonder toestemming of met ongeldig e-mailadres wordt geweigerd', () => {
  assert.throws(() => ctx.api_leadOpslaan({ modus: 'campagne', antwoorden: {}, domeinen: ['hr'] }, { email: 'geen-mail', toestemming: true }), /e-mailadres/);
  assert.throws(() => ctx.api_leadOpslaan({ modus: 'campagne', antwoorden: {}, domeinen: ['hr'] }, { email: 'a@b.nl', toestemming: false }), /toestemming/);
});

test('Slides-placeholders: scores, business case en prijzen in de vorm van het template', () => {
  const c = ctx.GSCalc.indexeer(ctx.laadContent_());
  const scan = { domeinen: ['payroll', 'hr'], kantoor: { naam: 'Van Dijk' }, antwoorden: ctx.SEED.responses.at(-1).scores, kerncijfers: { fte: 3.5, strokenPerMaand: 1200 }, voorstel: {} };
  const a = ctx.GSCalc.analyse(c, scan, ctx.laadBenchmark_(c));
  const w = ctx.slidesPlaceholders_(scan, a, c, 'nl', { naam: 'Sanne' });
  assert.equal(w.klantnaam, 'Van Dijk');
  assert.equal(w.PN, 'Medium 1000');
  assert.equal(w.ASS, '1.200');
  assert.equal(w.TPP, '€ 2.517');
  assert.equal(w.voordeel_1, '€ 11.582,75');
  assert.equal(w.kostprijs_huidig_1, '€ 12,86');
  assert.match(w.payroll_jij, /^\d,\d$/);
  assert.ok(w.kans1_titel);
});

test('cache: content en benchmark passen in de cache (stukken van max. 100 KB)', () => {
  ctx.cacheWis_(ctx.CACHE_CONTENT);
  const c1 = ctx.laadContent_();
  const c2 = ctx.laadContent_();
  assert.equal(c2.stellingen.length, c1.stellingen.length);
});
