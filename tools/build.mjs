// Bouwt de gegenereerde bestanden voor Apps Script:
//   apps-script/Seed.js        startdata voor de Google Sheet (content, benchmark, prijzen)
//   apps-script/CalcClient.html rekenmodel als <script> voor de browser
//
// Gebruik: node tools/build.mjs   (na python3 tools/extract_excel.py ...)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const excel = JSON.parse(read('data/excel_extract.json'));
const extra = JSON.parse(read('data/content.json'));

const domeinen = extra.domeinen.map((d) => ({
  ...d,
  subthemas: [...new Set(excel.stellingen.filter((s) => s.domein === d.id).map((s) => s.subthema))],
}));

const subthemas = {};
for (const s of excel.stellingen) {
  subthemas[s.subthema] = { ...extra.subthemas[s.subthema], domein: s.domein };
}

const stellingen = excel.stellingen.map((s, i) => {
  const e = extra.stellingen[s.id];
  if (!e) throw new Error(`Geen contentaanvulling voor ${s.id}`);
  return {
    id: s.id,
    volgorde: i + 1,
    domein: s.domein,
    subthema: s.subthema,
    nl: s.stelling,
    en: e.stelling_en,
    oplossing_nl: s.oplossing,
    oplossing_en: e.oplossing_en,
    functie: e.functie,
    doelscore: s.doelscore ?? 5,
    urenKolom: s.urenKolom,
    toonAls: '',
    actief: true,
    typeformKolom: s.typeformKolom,
    nrExcel: s.nrExcel,
    opmerkingExcel: s.opmerkingExcel || '',
  };
});

const urenbenchmark = {};
const urenLabels = {};
for (const u of excel.urenbenchmark) {
  urenbenchmark[u.kolom] = u.gemiddeldUrenPerMaand;
  urenLabels[u.kolom] = u.vraag;
}

const instellingen = {
  ...excel.instellingen,
  besteMethode: 'top10',
  besteAandeel: 0.1,
  matrixMaxScore: 3,
  standaardUurtarief: 45,
  hubspotAanmaken: true,
};
delete instellingen.voorbeeld;
delete instellingen.controle;

const seed = {
  versie: 1,
  bron: excel.bron,
  domeinen,
  subthemas,
  functies: extra.functies,
  stellingen,
  instellingen,
  urenbenchmark,
  urenLabels,
  prijzen: excel.prijzen,
  featureAdoption: excel.featureAdoption,
  responses: excel.responses,
  controle: { voorbeeld: excel.instellingen.voorbeeld, ...excel.instellingen.controle },
};

writeFileSync(
  join(root, 'apps-script/Seed.js'),
  '// GEGENEREERD door tools/build.mjs. Niet met de hand aanpassen; wijzig de content in de Google Sheet.\n' +
    'var SEED = ' + JSON.stringify(seed) + ';\n' +
    "if (typeof module !== 'undefined' && module.exports) module.exports = SEED;\n",
);

writeFileSync(
  join(root, 'apps-script/CalcClient.html'),
  '<script>\n// GEGENEREERD door tools/build.mjs uit Calc.js\n' + read('apps-script/Calc.js') + '\n</script>\n',
);

console.log(`Seed: ${stellingen.length} stellingen, ${seed.responses.length} kantoren, ${Object.keys(seed.functies).length} functionaliteiten`);
