// Controleert het rekenmodel tegen de uitkomsten van de Groei Scan MASTER-Excel.
// Draaien: npm test   (of: node --test test/)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const GSCalc = require('../apps-script/Calc.js');
const SEED = require('../apps-script/Seed.js');

const content = GSCalc.indexeer(structuredClone(SEED));
const voorbeeld = SEED.responses[SEED.responses.length - 1]; // het Excel-voorbeeldkantoor (laatste Typeform-regel)
const close = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('voorbeeldkantoor is het kantoor uit de Business Case (3,5 FTE, 1.200 stroken)', () => {
  assert.equal(voorbeeld.fte, SEED.controle.voorbeeld.fte);
  assert.equal(voorbeeld.strokenPerMaand, SEED.controle.voorbeeld.strokenPerMaand);
});

test('business case Payroll is gelijk aan de Excel tot op de cent', () => {
  const bc = GSCalc.businessCasePayroll(content, voorbeeld.scores, { fte: 3.5, strokenPerMaand: 1200 }, content.instellingen);
  close(bc.inefficientiePerStrook, SEED.controle.inefficientiePerStrook, 1e-6);
  bc.jaren.forEach((j, i) => {
    close(j.huidigeKosten, SEED.controle.huidigeKosten[i]);
    close(j.nieuweKosten, SEED.controle.nieuweKosten[i]);
    close(j.voordeel, SEED.controle.voordeel[i]);
  });
  close(bc.jaren[0].voordeel, 11582.75);
  close(bc.jaren[1].voordeel, 33165.51);
  close(bc.jaren[2].voordeel, 66331.02);
});

test('kostprijs per strook, FTE en stroken per FTE zoals in de Business Case', () => {
  const bc = GSCalc.businessCasePayroll(content, voorbeeld.scores, { fte: 3.5, strokenPerMaand: 1200 }, content.instellingen);
  close(bc.kostenPerStrook, 12.988);              // F8
  close(bc.jaren[0].huidigPerStrook, 12.86004665); // N6
  close(bc.jaren[2].nieuwPerStrook, 7.869865939);  // P7
  close(bc.inefficientieFte, 1.668231441, 1e-6);   // I12
  close(bc.jaren[2].fteMet, 1.334585153, 1e-6);    // U7
  close(bc.strokenPerFte, 342.8571429, 1e-6);      // C12
  close(bc.strokenPerFteMax, 655.104595, 1e-4);    // C13
  close(bc.jaren[2].strokenPerFteMet, 592.6551046, 1e-4); // U17
});

test('scores Payroll van het voorbeeldkantoor zoals Payroll!E16, E22, E33 en E34', () => {
  // Twee eigenaardigheden van de Excel nagebootst:
  //  - P14 (E17) is een vaste 1 in plaats van de Typeform-formule;
  //  - P19 (E23) pakt het laatst ingevulde antwoord in kolom S, van een eerder kantoor (3).
  const alsExcel = { ...voorbeeld.scores, P14: 1, P19: 3 };
  const sc = GSCalc.scores(content, alsExcel, ['payroll']);
  close(sc.subthema.automatisering, 2.636363636, 1e-6);
  close(sc.subthema.flexibiliteit, 3.2, 1e-6);
  close(sc.subthema.efficiency, 2.888888889, 1e-6);
  close(sc.domein.payroll, 2.908417508, 1e-6);
});

test('benchmark: gemiddelde stroken per FTE over alle 46 kantoren', () => {
  // De Excel toont 1.247 (Feature Adoption!D19 = CG2/CH2). Daar staan 23 van de 46 aantallen stroken
  // en 8 aantallen FTE als tekst in de cel, die AVERAGE overslaat. Over alle kantoren is het 1.101.
  const bm = GSCalc.benchmark(content, SEED.responses, { besteMethode: 'excel' });
  assert.equal(bm.n, 46);
  assert.equal(bm.strokenPerFte.n, 46);
  close(bm.strokenPerFte.gemiddeld, 540665 / 490.85, 1e-6);
});

test('benchmark: "beste" volgens Excel is het gemiddelde van de hoogste score per stelling', () => {
  const bm = GSCalc.benchmark(content, SEED.responses, { besteMethode: 'excel' });
  const top10 = GSCalc.benchmark(content, SEED.responses, { besteMethode: 'top10' });
  for (const d of content.domeinen) {
    assert.ok(bm.domein[d.id].beste >= top10.domein[d.id].beste - 1e-9, `${d.id}: excel-methode hoort hoger of gelijk te zijn`);
    assert.ok(top10.domein[d.id].beste >= bm.domein[d.id].gem, `${d.id}: beste hoort boven gemiddeld te liggen`);
  }
});

test('pakketadvies voor 3.100 stroken zoals Pricing 26 (Medium 2500, € 5.813, Up&Go € 3.099)', () => {
  const p = GSCalc.prijsAdvies(content.prijzen, 3100, {});
  assert.equal(p.pakket.naam, 'Medium 2500');
  close(p.pakket.totaal, 5813);
  assert.equal(p.startpakket.rij.upGoEssential, 3099);
  assert.equal(p.vacatures, 155); // 5% van 3.100
  assert.equal(p.add.hire.prijs, 499);
});

test('pakketadvies kiest altijd het goedkoopste pakket', () => {
  for (const n of [10, 59, 61, 150, 300, 560, 1200, 2600, 5200, 12000]) {
    const p = GSCalc.prijsAdvies(content.prijzen, n, {});
    for (const o of p.alleOpties) assert.ok(p.pakket.totaal <= o.totaal + 1e-9);
  }
});

test('business case overige domeinen: uren x tarief x 52 x (1 - score/5)', () => {
  const bc = GSCalc.businessCaseDomein({ urenPerWeek: 10, uurtarief: 50 }, 2, content.instellingen);
  close(bc.kostenJaar, 26000);
  close(bc.teWinnenJaar, 15600);
  close(bc.jaren[2].voordeel, 15600 * 0.8);
  assert.equal(GSCalc.businessCaseDomein({ urenPerWeek: 0, uurtarief: 50 }, 2, content.instellingen), null);
});

test('voorwaarden (toonAls) verbergen alleen bij een beantwoorde, niet-passende score', () => {
  const s = { toonAls: 'H16 >= 4' };
  assert.equal(GSCalc.isZichtbaar(s, {}), true);
  assert.equal(GSCalc.isZichtbaar(s, { H16: 2 }), false);
  assert.equal(GSCalc.isZichtbaar(s, { H16: 4 }), true);
  assert.equal(GSCalc.isZichtbaar({ toonAls: 'onzin' }, { H16: 1 }), true);
});

test('prioriteren: één punt per functionaliteit, alleen scores <= 3, handmatige positie wint', () => {
  const scan = { domeinen: ['payroll', 'hr'], antwoorden: voorbeeld.scores, kerncijfers: { fte: 3.5, strokenPerMaand: 1200 }, overigeKosten: { hr: { urenPerWeek: 8, uurtarief: 55 } } };
  const a = GSCalc.analyse(content, scan);
  assert.ok(a.matrix.length > 0);
  assert.equal(new Set(a.matrix.map((m) => m.functie)).size, a.matrix.length);
  for (const m of a.matrix) {
    assert.ok(m.minScore <= 3);
    for (const id of m.stellingen) assert.ok(a.scores.stelling[id] <= 3 && content.stellingById[id].functie === m.functie);
  }
  assert.ok(a.kansen.length <= 5 && a.kansen.length > 0);
  const f = a.matrix[0].functie;
  const b = GSCalc.analyse(content, { ...scan, matrix: { [f]: { x: 0.9, y: 0.9 } } });
  const m = b.matrix.find((x) => x.functie === f);
  assert.equal(m.kwadrant, 'heroverwegen');
  assert.equal(m.handmatig, true);
});

test('prioriteren: de 12 belangrijkste punten (standaard op de matrix) overlappen niet', () => {
  const alles1 = Object.fromEntries(content.stellingen.map((s) => [s.id, 1]));
  const gevallen = [alles1, voorbeeld.scores];
  for (const antwoorden of gevallen) {
    const a = GSCalc.analyse(content, { domeinen: ['payroll', 'hr', 'tech', 'zelf'], antwoorden, kerncijfers: {} });
    const top = a.matrix.slice(0, 12);
    let botsingen = 0;
    for (let i = 0; i < top.length; i++) for (let j = 0; j < i; j++) {
      if (Math.abs(top[i].x - top[j].x) < 0.19 - 1e-9 && Math.abs(top[i].y - top[j].y) < 0.065 - 1e-9) botsingen++;
    }
    assert.equal(botsingen, 0, `${botsingen} botsingen in de top 12`);
  }
});

test('content: 82 stellingen, elk met NL, EN, oplossing en bestaande functionaliteit', () => {
  assert.equal(content.stellingen.length, 82);
  for (const s of content.stellingen) {
    assert.ok(s.nl && s.en && s.oplossing_nl && s.oplossing_en, s.id);
    assert.ok(content.functies[s.functie], `${s.id}: functie ${s.functie}`);
  }
  for (const d of content.domeinen) assert.ok(d.subthemas.length >= 3);
});
