// Lokale ontwikkelserver: rendert de Apps Script-templates en bootst de server-API na
// met de startdata uit Seed.js (in het geheugen). Geen Google-account nodig.
//
//   npm run dev          ->  http://localhost:8080/?modus=begeleid
//                            http://localhost:8080/?modus=campagne&utm_source=linkedin
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const GSCalc = require('../apps-script/Calc.js');
const SEED = require('../apps-script/Seed.js');
const PORT = Number(process.env.PORT || 8080);

// Content in dezelfde vorm als leesContentUitSheet_() in Store.js
function content() {
  return GSCalc.indexeer({
    domeinen: SEED.domeinen.map((d) => ({ id: d.id, nl: d.nl, en: d.en, rapport_nl: d.rapport_nl, rapport_en: d.rapport_en, kleur: d.kleur, subthemas: d.subthemas })),
    subthemas: SEED.subthemas,
    functies: SEED.functies,
    stellingen: SEED.stellingen.map((s) => ({ id: s.id, volgorde: s.volgorde, domein: s.domein, subthema: s.subthema, nl: s.nl, en: s.en, oplossing_nl: s.oplossing_nl, oplossing_en: s.oplossing_en, functie: s.functie, doelscore: s.doelscore, urenKolom: s.urenKolom, toonAls: s.toonAls, actief: s.actief })),
    instellingen: { ...SEED.instellingen, hireVacatureAandeel: SEED.prijzen.hireVacatureAandeel, rapportVersie: 'Nmbrs ACC Groei Scan FULL', kickoffUrl: '' },
    urenbenchmark: SEED.urenbenchmark,
    prijzen: SEED.prijzen,
    teksten: {},
  });
}

const store = { scans: new Map(), responses: SEED.responses.slice(), leads: [] };
let benchmark = GSCalc.benchmark(content(), store.responses, { besteMethode: SEED.instellingen.besteMethode });
const consultant = { email: 'consultant@visma.com', naam: 'Sanne de Vries', rol: 'beheerder' };

function render(file) {
  let html = readFileSync(join(root, 'apps-script', file + '.html'), 'utf8');
  return html.replace(/<\?!= include\('(\w+)'\) \?>/g, (_, n) => render(n));
}

const api = {
  api_scanOpslaan(scan) {
    const now = new Date().toISOString();
    const bestaand = scan.id && store.scans.get(scan.id);
    if (bestaand && bestaand.modus === 'campagne' && bestaand.sleutel !== scan.sleutel) throw new Error('Geen toegang tot deze scan.');
    scan.id = scan.id || `G${scan.modus === 'begeleid' ? 'S' : 'C'}-DEV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    if (!bestaand && scan.modus !== 'begeleid') scan.sleutel = Math.random().toString(36).slice(2);
    scan.aangemaakt = bestaand?.aangemaakt || now;
    scan.gewijzigd = now;
    if (scan.modus === 'begeleid') scan.consultant = consultant.email;
    store.scans.set(scan.id, structuredClone(scan));
    return { id: scan.id, gewijzigd: now, aangemaakt: scan.aangemaakt, sleutel: scan.sleutel || null };
  },
  api_scanAfronden(scan) {
    scan.status = 'afgerond';
    const res = api.api_scanOpslaan(scan);
    store.responses = store.responses.filter((r) => r.id !== scan.id);
    store.responses.push({ id: scan.id, fte: scan.kerncijfers?.fte, strokenPerMaand: scan.kerncijfers?.strokenPerMaand, scores: scan.antwoorden });
    benchmark = GSCalc.benchmark(content(), store.responses, { besteMethode: SEED.instellingen.besteMethode });
    return { ...res, benchmark };
  },
  api_scanLaden(id) {
    const s = store.scans.get(id);
    if (!s) throw new Error('Scan niet gevonden.');
    return s;
  },
  api_mijnScans() {
    const c = content();
    return [...store.scans.values()].filter((s) => s.modus === 'begeleid').reverse().map((s) => {
      const a = GSCalc.analyse(c, s);
      return { id: s.id, kantoor: s.kantoor?.naam, status: s.status, gewijzigd: s.gewijzigd, consultant: s.consultant, score: a.scores.totaal ?? '', voordeel: a.businessCase.totaalVoordeel || '', domeinen: s.domeinen.join(', '), slidesUrl: s.rapport?.slidesUrl || '', pdfUrl: s.rapport?.pdfUrl || '' };
    });
  },
  api_leadOpslaan(scan, lead) {
    if (!lead?.email) throw new Error('Vul een geldig e-mailadres in.');
    store.leads.push({ ...lead, scanId: scan.id, datum: new Date().toISOString() });
    scan.lead = lead;
    const res = api.api_scanAfronden(scan);
    console.log('[dev] lead opgeslagen', lead.email);
    return { ...res, ok: true };
  },
  api_hubspotZoekBedrijf(q) {
    return q ? [{ id: '1001', naam: q + ' B.V.', domein: q.toLowerCase().replace(/\W/g, '') + '.nl', plaats: 'Utrecht' }] : [];
  },
  api_hubspotSync(id) {
    return { companyId: '1001', contactId: '2002', noteId: '3003', gesynchroniseerd: new Date().toISOString() };
  },
  api_slidesMaken(id, grafieken) {
    console.log('[dev] Slides gevraagd met grafieken:', Object.keys(grafieken).join(', '), `(${Math.round(JSON.stringify(grafieken).length / 1024)} KB)`);
    const s = store.scans.get(id);
    s.rapport = { slidesUrl: 'https://docs.google.com/presentation/d/DEV/edit', pdfUrl: 'https://drive.google.com/file/d/DEV/view' };
    return s.rapport;
  },
};

// PDF-bibliotheken lokaal (npm install), zodat de PDF ook zonder CDN te testen is.
const MOCK = `<script>window.__PDF_LIBS=[['html2canvas',['/vendor/html2canvas.min.js']],['jspdf',['/vendor/jspdf.umd.min.js']]];window.__MOCK_API=function(n,a){return fetch('/api/'+n,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a)}).then(function(r){return r.json()}).then(function(j){if(j.error)throw new Error(j.error);return j.result})};</script>`;

createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === 'POST' && url.pathname.startsWith('/api/')) {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const naam = url.pathname.slice(5);
      try {
        if (!api[naam]) throw new Error('Onbekende functie ' + naam);
        const result = api[naam](...JSON.parse(body || '[]'));
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ result }));
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  const vendor = { '/vendor/html2canvas.min.js': 'node_modules/html2canvas/dist/html2canvas.min.js', '/vendor/jspdf.umd.min.js': 'node_modules/jspdf/dist/jspdf.umd.min.js' };
  if (vendor[url.pathname]) {
    try { res.writeHead(200, { 'Content-Type': 'text/javascript' }).end(readFileSync(join(root, vendor[url.pathname]))); }
    catch { res.writeHead(404).end(); }
    return;
  }
  if (url.pathname !== '/') { res.writeHead(404).end(); return; }
  const modus = url.searchParams.get('modus') === 'campagne' ? 'campagne' : 'begeleid';
  const taal = url.searchParams.get('taal') === 'en' ? 'en' : 'nl';
  const bron = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign']) if (url.searchParams.get(k)) bron[k] = url.searchParams.get(k);
  const boot = {
    ctx: { modus, taal, taalExpliciet: url.searchParams.has('taal'), gebruiker: modus === 'begeleid' ? consultant : null, appUrl: `http://localhost:${PORT}/`, versie: 1 },
    content: content(), benchmark, scanId: url.searchParams.get('scan'), bron,
  };
  const html = render('Index')
    .replace('<?!= bootJson ?>', JSON.stringify(boot).replace(/</g, '\\u003c'))
    .replace('</head>', MOCK + '</head>');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
}).listen(PORT, () => console.log(`Groei Scan dev: http://localhost:${PORT}/?modus=begeleid  ·  ?modus=campagne`));
