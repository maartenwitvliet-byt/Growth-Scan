// Bouwt een losse demo-pagina (dev/demo.html) van de app, met een nagebootste
// server in de browser. Handig om de app te laten zien zonder Apps Script.
//   node tools/demo.mjs   ->  dev/demo.html   (#campagne voor de campagnemodus)
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const GSCalc = require('../apps-script/Calc.js');
const SEED = require('../apps-script/Seed.js');

const content = {
  domeinen: SEED.domeinen.map((d) => ({ id: d.id, nl: d.nl, en: d.en, rapport_nl: d.rapport_nl, rapport_en: d.rapport_en, kleur: d.kleur, subthemas: d.subthemas })),
  subthemas: SEED.subthemas, functies: SEED.functies,
  stellingen: SEED.stellingen.map((s) => ({ id: s.id, volgorde: s.volgorde, domein: s.domein, subthema: s.subthema, nl: s.nl, en: s.en, oplossing_nl: s.oplossing_nl, oplossing_en: s.oplossing_en, functie: s.functie, doelscore: s.doelscore, urenKolom: s.urenKolom, toonAls: s.toonAls, actief: s.actief })),
  instellingen: { ...SEED.instellingen, hireVacatureAandeel: SEED.prijzen.hireVacatureAandeel, rapportVersie: 'Nmbrs ACC Groei Scan FULL' },
  urenbenchmark: SEED.urenbenchmark, prijzen: SEED.prijzen, teksten: {},
};
const benchmark = GSCalc.benchmark(GSCalc.indexeer(structuredClone(content)), SEED.responses, { besteMethode: 'top10' });
const responses = SEED.responses.map((r) => ({ id: r.id, fte: r.fte, strokenPerMaand: r.strokenPerMaand, scores: r.scores }));

function render(file) {
  return readFileSync(join(root, 'apps-script', file + '.html'), 'utf8').replace(/<\?!= include\('(\w+)'\) \?>/g, (_, n) => render(n));
}

const mock = `<script>
(function () {
  var campagne = location.hash === '#campagne';
  var boot = ${JSON.stringify({ content, benchmark }).replace(/</g, '\\u003c')};
  var responses = ${JSON.stringify(responses)};
  boot.ctx = { modus: campagne ? 'campagne' : 'begeleid', taal: 'nl', gebruiker: campagne ? null : { email: 'consultant@visma.com', naam: 'Demo Consultant', rol: 'beheerder' }, versie: 1 };
  boot.bron = {}; boot.scanId = null;
  window.__BOOT = boot;
  var scans = {}, nr = 0;
  function kopie(o) { return JSON.parse(JSON.stringify(o)); }
  var api = {
    api_scanOpslaan: function (s) { s.id = s.id || 'DEMO-' + (++nr); s.gewijzigd = new Date().toISOString(); s.aangemaakt = s.aangemaakt || s.gewijzigd; scans[s.id] = kopie(s); return { id: s.id, gewijzigd: s.gewijzigd, aangemaakt: s.aangemaakt, sleutel: 'demo' }; },
    api_scanAfronden: function (s) { s.status = 'afgerond'; var r = api.api_scanOpslaan(s); responses.push({ id: s.id, fte: (s.kerncijfers || {}).fte, strokenPerMaand: (s.kerncijfers || {}).strokenPerMaand, scores: s.antwoorden }); r.benchmark = GSCalc.benchmark(GS.content, responses, { besteMethode: 'top10' }); return r; },
    api_scanLaden: function (id) { if (!scans[id]) throw new Error('Scan niet gevonden'); return kopie(scans[id]); },
    api_mijnScans: function () { return Object.keys(scans).reverse().map(function (id) { var s = scans[id]; var a = GSCalc.analyse(GS.content, s); return { id: id, kantoor: s.kantoor.naam, status: s.status, gewijzigd: s.gewijzigd, score: a.scores.totaal == null ? '' : a.scores.totaal, voordeel: a.businessCase.totaalVoordeel || '', domeinen: s.domeinen.join(', '), slidesUrl: (s.rapport || {}).slidesUrl || '', pdfUrl: '' }; }); },
    api_leadOpslaan: function (s, lead) { s.lead = lead; var r = api.api_scanAfronden(s); r.ok = true; return r; },
    api_hubspotZoekBedrijf: function (q) { return q ? [{ id: '1001', naam: q, domein: '', plaats: 'Demo' }] : []; },
    api_hubspotSync: function () { return { companyId: '1001', contactId: '2002', noteId: '3003' }; },
    api_slidesMaken: function () { throw new Error('In deze demo wordt geen Google Slides gemaakt. In de echte app staat het rapport dan in Google Drive.'); }
  };
  window.__MOCK_API = function (n, a) { return new Promise(function (res, rej) { setTimeout(function () { try { res(api[n].apply(null, a)); } catch (e) { rej(e); } }, 250); }); };
  window.addEventListener('hashchange', function () { location.reload(); });
})();
</script>`;

const banner = `<div id="demoBalk" style="position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:1050;display:flex;gap:6px;align-items:center;background:#00001D;color:#fff;border-radius:999px;padding:6px 8px 6px 16px;font:600 13px Inter,Arial,sans-serif;box-shadow:0 14px 40px rgba(1,1,73,.3)">Demo<a href="#begeleid" style="color:#fff;background:rgba(255,255,255,.14);border-radius:999px;padding:6px 12px;text-decoration:none">Begeleide modus</a><a href="#campagne" style="color:#fff;background:rgba(255,255,255,.14);border-radius:999px;padding:6px 12px;text-decoration:none">Campagnemodus</a></div>`;

let html = render('Index')
  .replace('<script>window.__BOOT = <?!= bootJson ?>;</script>', mock)
  .replace('<base target="_top">', '')
  .replace('</body>', banner + '</body>');
// De artifact-omgeving levert zelf de document-structuur; titel bovenaan.
html = html.replace('<!DOCTYPE html>', '').replace(/<html lang="nl">\s*<head>/, '<title>Nmbrs Groei Scan</title>').replace(/<\/head>\s*<body>/, '').replace(/<\/body>\s*<\/html>\s*$/, '');
writeFileSync(join(root, 'dev', 'demo.html'), html);
console.log('dev/demo.html', Math.round(html.length / 1024), 'KB');
