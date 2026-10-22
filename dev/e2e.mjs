// End-to-end-test van beide modi tegen de lokale ontwikkelserver.
//   npm run dev  (in een ander venster)   en dan:   node dev/e2e.mjs
// Screenshots komen in dev/screenshots/. Faalt bij elke JavaScript-fout in de pagina.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(join(execSync('npm root -g').toString().trim(), 'playwright')); }
const { chromium } = playwright;

const BASE = process.env.BASE || 'http://localhost:8080/';
const OUT = process.env.OUT || join(dirname(fileURLToPath(import.meta.url)), 'screenshots');
mkdirSync(OUT, { recursive: true });
const fouten = [];
const stap = (m) => console.log('·', m);

async function nieuwePagina(browser, opts = {}) {
  const page = await browser.newPage({ viewport: opts.viewport || { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => fouten.push(`[pageerror] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|net::ERR|Failed to load resource/.test(m.text())) fouten.push(`[console] ${m.text()}`); });
  return page;
}
const shot = (page, naam, full = true) => page.screenshot({ path: join(OUT, naam + '.png'), fullPage: full });

async function scoorAlles(page, patroon) {
  for (let i = 0; i < 120; i++) {
    const klaar = await page.$('.done-banner');
    if (klaar) return;
    const v = patroon[i % patroon.length];
    await page.keyboard.press(String(v));
    await page.waitForTimeout(380);
  }
}

const browser = await chromium.launch();
try {
  // ---------------- Campagne ----------------
  stap('campagne: start');
  let page = await nieuwePagina(browser);
  await page.goto(BASE + '?modus=campagne&utm_source=linkedin', { waitUntil: 'networkidle' });
  await shot(page, '01-campagne-start', false);
  await page.fill('#kNaam', 'Accountantskantoor De Berg');
  await page.click('.domain-card[data-id="tech"]'); // Technologie uit
  await page.click('[data-act="startScan"]');
  await page.waitForSelector('.q-card');
  await shot(page, '02-campagne-scan', false);
  stap('campagne: scoren');
  await scoorAlles(page, [2, 3, 1, 4, 2, 3, 5, 2]);
  await shot(page, '03-campagne-scan-klaar', false);
  await page.click('.done-banner [data-act="ga"]');
  await page.waitForSelector('.res-total');
  await shot(page, '04-campagne-resultaten');
  stap('campagne: business case');
  await page.click('.nav-row [data-act="volgende"]');
  await page.fill('#kcFte', '4');
  await page.fill('#kcStroken', '2.400');
  await page.fill('#ovhrU', '12');
  await page.fill('#ovzelfU', '6');
  await page.waitForTimeout(400);
  await shot(page, '05-campagne-businesscase');
  stap('campagne: rapport + leadformulier');
  await page.click('.nav-row [data-act="volgende"]');
  await page.waitForSelector('.thumb');
  await shot(page, '06-campagne-rapport');
  await page.click('[data-act="pdf"]');
  await page.waitForSelector('#leadForm');
  await shot(page, '07-campagne-lead', false);
  await page.click('#leadForm [type="submit"]');
  await page.waitForSelector('#leadFout:not(.hidden)');
  await page.fill('#ldnaam', 'Jan de Berg');
  await page.fill('#ldemail', 'jan@deberg.nl');
  await page.check('#ldToestemming');
  await page.click('#leadForm [type="submit"]');
  await page.waitForSelector('#leadForm', { state: 'detached' });
  stap('campagne: PDF maken');
  await page.waitForSelector('.modal a[download]', { timeout: 120000 });
  await shot(page, '08-campagne-pdf-klaar', false);
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('.modal a[download]')]);
  const pdfPad = join(OUT, 'groeirapport-campagne.pdf');
  await download.saveAs(pdfPad);
  const pdf = (await import('node:fs')).readFileSync(pdfPad);
  const paginas = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  stap(`PDF: ${download.suggestedFilename()} · ${paginas} pagina's · ${Math.round(pdf.length / 1024)} KB`);
  if (paginas < 10) fouten.push('[pdf] te weinig pagina\'s: ' + paginas);
  await page.close();

  // ---------------- Begeleid ----------------
  stap('begeleid: home');
  page = await nieuwePagina(browser);
  await page.goto(BASE + '?modus=begeleid', { waitUntil: 'networkidle' });
  await page.waitForSelector('#scanRijen');
  await shot(page, '10-begeleid-home', false);
  await page.click('[data-act="nieuweScan"]');
  await page.fill('#kNaam', 'Van Dijk Salarisadministratie');
  await page.fill('#kCNaam', 'Petra van Dijk');
  await page.fill('#kCMail', 'petra@vandijk.nl');
  await page.fill('#hsZoek', 'Van Dijk');
  await page.click('[data-act="hsZoek"]');
  await page.waitForSelector('[data-act="hsKies"]');
  await page.click('[data-act="hsKies"]');
  await shot(page, '11-begeleid-start');
  stap('begeleid: kerncijfers');
  await page.click('.nav-row [data-act="volgende"]');
  await page.fill('#kcFte', '3,5');
  await page.fill('#kcStroken', '1200');
  await page.fill('#ovhrU', '10');
  await page.fill('#ovtechU', '3');
  await page.fill('#ovzelfU', '5');
  await page.waitForTimeout(300);
  await shot(page, '12-begeleid-kerncijfers');
  stap('begeleid: scan');
  await page.click('.nav-row [data-act="volgende"]');
  await page.waitForSelector('.q-card');
  await page.click('[data-act="toonOplossing"]');
  await page.fill('textarea[id^="nt"]', 'Controle gebeurt nu met Excel-lijsten.');
  await page.keyboard.press('Escape');
  await page.click('.q-card .eyebrow');
  await shot(page, '13-begeleid-scan', false);
  await scoorAlles(page, [2, 3, 2, 1, 4, 3, 2, 5, 3]);
  await page.click('.done-banner [data-act="ga"]');
  await page.waitForSelector('.res-total');
  await page.click('.dcard[data-id="hr"]');
  await shot(page, '14-begeleid-resultaten');
  stap('begeleid: prioriteren');
  await page.click('.nav-row [data-act="volgende"]');
  await page.waitForSelector('#matrix .mpoint');
  const punt = await page.$('#matrix .mpoint');
  const box = await punt.boundingBox();
  const m = await (await page.$('#matrix')).boundingBox();
  await page.mouse.move(box.x + 10, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(m.x + m.width * 0.15, m.y + m.height * 0.15, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  await shot(page, '15-begeleid-prioriteren');
  stap('begeleid: business case');
  await page.click('.nav-row [data-act="volgende"]');
  await page.waitForSelector('.bc-total');
  await shot(page, '16-begeleid-businesscase');
  stap('begeleid: voorstel');
  await page.click('.nav-row [data-act="volgende"]');
  await page.waitForSelector('.advice');
  await page.check('input[data-bind="voorstel.opties.perform"]');
  await page.check('input[data-bind="voorstel.opties.expense"]');
  await page.waitForTimeout(600);
  await shot(page, '17-begeleid-voorstel');
  stap('begeleid: rapport');
  await page.click('.nav-row [data-act="volgende"]');
  await page.waitForSelector('.thumb');
  await page.waitForTimeout(300);
  await shot(page, '18-begeleid-rapport');
  const aantal = await page.$$eval('.thumb', (x) => x.length);
  stap(`rapport heeft ${aantal} slides`);
  await page.click('.thumb[data-i="0"]');
  await page.waitForSelector('.present .slide');
  for (let i = 0; i < aantal; i++) {
    await page.waitForTimeout(650);
    await page.screenshot({ path: join(OUT, `slide-${String(i + 1).padStart(2, '0')}.png`) });
    await page.keyboard.press('ArrowRight');
  }
  await page.keyboard.press('Escape');
  stap('begeleid: Slides, HubSpot, afronden');
  await page.click('[data-act="slides"]');
  await page.waitForSelector('a[href*="presentation"]', { timeout: 15000 });
  await page.click('[data-act="hubspot"]');
  await page.waitForTimeout(500);
  await page.click('[data-act="afronden"]');
  await page.waitForSelector('.chip.ok');
  await shot(page, '19-begeleid-afgerond', false);
  stap('begeleid: taalwissel');
  await page.click('[data-act="taal"][data-taal="en"]');
  await page.waitForTimeout(300);
  await shot(page, '20-begeleid-rapport-en', false);
  await page.click('[data-act="naarHome"]');
  await page.waitForSelector('#scanRijen tr[data-act="openScan"]');
  await shot(page, '21-begeleid-home-na', false);
  await page.close();

  // ---------------- Mobiel ----------------
  stap('mobiel');
  page = await nieuwePagina(browser, { viewport: { width: 390, height: 844 } });
  await page.goto(BASE + '?modus=campagne', { waitUntil: 'networkidle' });
  await shot(page, '30-mobiel-start');
  await page.click('[data-act="startScan"]');
  await page.waitForSelector('.q-card');
  await page.keyboard.press('3');
  await page.waitForTimeout(500);
  await shot(page, '31-mobiel-scan', false);
  const breed = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (breed) fouten.push('[layout] horizontale scroll op mobiel');
  await page.close();
} catch (e) {
  fouten.push('[test] ' + e.message);
} finally {
  await browser.close();
}

if (fouten.length) {
  console.error('\nFOUTEN:\n' + fouten.join('\n'));
  process.exit(1);
}
console.log('\nAlles doorlopen zonder fouten. Screenshots: ' + OUT);
