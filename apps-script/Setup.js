/**
 * Eenmalige inrichting. Voer setup() uit in de Apps Script-editor, ingelogd als
 * sales.nmbrs@visma.com. Daarna:
 *   1. Script Properties: SLIDES_TEMPLATE_ID (master-Slides) en HUBSPOT_TOKEN.
 *   2. Twee deployments (zie README): begeleid (visma.com) en campagne (iedereen).
 *
 * setup() is veilig om opnieuw te draaien: bestaande tabbladen met inhoud
 * blijven staan. Gebruik herimporteerContent() om de content te overschrijven.
 */

function setup() {
  var props = PropertiesService.getScriptProperties();
  var ss;
  var id = props.getProperty('SPREADSHEET_ID');
  if (id) {
    ss = SpreadsheetApp.openById(id);
  } else {
    ss = SpreadsheetApp.create('Nmbrs Groei Scan · Data');
    props.setProperty('SPREADSHEET_ID', ss.getId());
  }

  Object.keys(TABS).forEach(function (key) {
    var def = TABS[key];
    var sh = ss.getSheetByName(def.naam);
    if (!sh) sh = ss.insertSheet(def.naam);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, def.kolommen.length).setValues([def.kolommen]).setFontWeight('bold').setBackground('#E7E5FF');
      sh.setFrozenRows(1);
    }
  });
  var leeg = ss.getSheetByName('Sheet1') || ss.getSheetByName('Blad1');
  if (leeg && ss.getSheets().length > 1) ss.deleteSheet(leeg);

  if (tab_('stellingen').getLastRow() < 2) importeerContent_();
  if (tab_('scans').getLastRow() < 2) importeerBenchmark_();
  if (tab_('consultants').getLastRow() < 2) {
    var eigenaar = Session.getEffectiveUser().getEmail();
    tab_('consultants').appendRow([eigenaar, 'Beheerder', 'beheerder', true]);
  }
  maakDashboard_(ss);
  zorgVoorMap_();
  installeerTriggers_(ss);
  cacheWis_(CACHE_CONTENT);
  cacheWis_(CACHE_BENCHMARK);
  herberekenBenchmark_(GSCalc.indexeer(laadContent_()));
  Logger.log('Klaar. Sheet: ' + ss.getUrl());
  return ss.getUrl();
}

/** Overschrijft alle content-tabbladen met de startdata uit Seed.js. Scans blijven staan. */
function herimporteerContent() {
  importeerContent_();
  cacheWis_(CACHE_CONTENT);
}

function importeerContent_() {
  schrijfTab_('domeinen', SEED.domeinen.map(function (d, i) {
    return { id: d.id, nl: d.nl, en: d.en, rapport_nl: d.rapport_nl, rapport_en: d.rapport_en, kleur: d.kleur, volgorde: i + 1 };
  }));
  var subs = [];
  SEED.domeinen.forEach(function (d) {
    d.subthemas.forEach(function (s) { subs.push({ id: s, domein: d.id, nl: SEED.subthemas[s].nl, en: SEED.subthemas[s].en, volgorde: subs.length + 1 }); });
  });
  schrijfTab_('subthemas', subs);
  schrijfTab_('functies', Object.keys(SEED.functies).map(function (k) {
    var f = SEED.functies[k];
    return { id: k, nl: f.nl, en: f.en, beschrijving_nl: f.beschrijving_nl, beschrijving_en: f.beschrijving_en, inspanning: f.inspanning };
  }));
  schrijfTab_('stellingen', SEED.stellingen);

  var toelichting = {
    salarisAdministrateurMaand: 'Brutomaandsalaris salarisadministrateur (Business Case C10)',
    werkgeverslastenFactor: 'Opslag werkgeverslasten, 1,3 = 130%',
    aandeelSalarisverwerking: 'Deel van de tijd aan salarisverwerking (C15)',
    softwarekostenPerStrook: 'Huidige softwarekosten per strook (F6)',
    conversieInvestering: 'Eenmalige conversie-investering in jaar 1 (C11)',
    efficiencyMetNmbrs: 'Gerealiseerde winst per jaar met Nmbrs (N15:N17)',
    efficiencyZonderNmbrs: 'Autonome verbetering per jaar zonder Nmbrs (O15:O17)',
    potentieStrokenPerFte: 'Potentie stroken per FTE per maand (Feature Adoption E19)',
    besteMethode: '"top10" = gemiddelde van de best scorende 10% kantoren; "excel" = hoogste score per stelling',
    besteAandeel: 'Aandeel kantoren voor "beste" bij top10 (0,1 = 10%)',
    matrixMaxScore: 'Stellingen met deze score of lager komen op de prioriteringsmatrix',
    standaardUurtarief: 'Voorgesteld uurtarief bij HR, Technologie en Zelfredzaamheid',
    hireVacatureAandeel: 'Vacatures als deel van het aantal medewerkers (Pricing 26 T15)',
    rapportVersie: 'Versie op de cover van het rapport',
    kickoffUrl: 'Link achter "Plan de kickoff" (optioneel)'
  };
  var ins = Object.assign({}, SEED.instellingen, { hireVacatureAandeel: SEED.prijzen.hireVacatureAandeel, rapportVersie: 'Nmbrs ACC Groei Scan FULL', kickoffUrl: '' });
  schrijfTab_('instellingen', Object.keys(ins).map(function (k) {
    var v = ins[k];
    return { sleutel: k, waarde: (typeof v === 'object') ? JSON.stringify(v) : v, toelichting: toelichting[k] || '' };
  }));

  schrijfTab_('uren', Object.keys(SEED.urenbenchmark).map(function (k) {
    return { kolom: k, vraag: SEED.urenLabels[k], gemiddeldUrenPerMaand: SEED.urenbenchmark[k] };
  }));
  schrijfTab_('pakketten', SEED.prijzen.pakketten);
  schrijfTab_('startpakketten', SEED.prijzen.startpakketten);
  var opties = [];
  ['perform', 'hire', 'expense', 'pay', 'engage'].forEach(function (p) {
    SEED.prijzen[p].forEach(function (t) { opties.push({ product: p, van: t.van, tot: t.tot, prijs: t.prijs }); });
  });
  schrijfTab_('opties', opties);
  schrijfTab_('teksten', Object.keys(TEKSTEN).map(function (k) { return { sleutel: k, nl: TEKSTEN[k].nl, en: TEKSTEN[k].en }; }));
}

/** De 46 kantoren uit de Typeform als afgeronde scans in de benchmark. */
function importeerBenchmark_() {
  var nu = new Date().toISOString();
  var content = GSCalc.indexeer(laadContentZonderCache_());
  SEED.responses.forEach(function (r) {
    var scan = {
      id: r.id, aangemaakt: nu, gewijzigd: nu, modus: 'import', status: 'afgerond', taal: 'nl',
      kantoor: { naam: 'Benchmark ' + r.id }, domeinen: ['payroll', 'hr', 'tech', 'zelf'],
      kerncijfers: { fte: r.fte, strokenPerMaand: r.strokenPerMaand }, antwoorden: r.scores, bron: { bron: r.bron }
    };
    schrijfScanRij_(scan, GSCalc.analyse(content, scan));
    schrijfAntwoorden_(scan, content);
  });
}

function laadContentZonderCache_() {
  return leesContentUitSheet_();
}

function maakDashboard_(ss) {
  var sh = ss.getSheetByName('Dashboard') || ss.insertSheet('Dashboard', 0);
  sh.clear();
  var rows = [
    ['Nmbrs Groei Scan · Dashboard', ''],
    ['', ''],
    ['Scans totaal (excl. import)', '=COUNTIFS(Scans!D:D,"<>import",Scans!A:A,"<>id",Scans!A:A,"<>")'],
    ['Begeleide scans', '=COUNTIF(Scans!D:D,"begeleid")'],
    ['Campagnescans', '=COUNTIF(Scans!D:D,"campagne")'],
    ['Afgeronde scans', '=COUNTIFS(Scans!E:E,"afgerond",Scans!D:D,"<>import")'],
    ['Kantoren in de benchmark', '=COUNTIF(Scans!AD:AD,TRUE)'],
    ['Leads (campagne)', '=MAX(0,COUNTA(Leads!A:A)-1)'],
    ['', ''],
    ['Gemiddelde totaalscore', '=IFERROR(AVERAGEIFS(Scans!N:N,Scans!AD:AD,TRUE),"")'],
    ['Gemiddeld Payroll', '=IFERROR(AVERAGEIFS(Scans!O:O,Scans!AD:AD,TRUE,Scans!O:O,"<>"),"")'],
    ['Gemiddeld HR', '=IFERROR(AVERAGEIFS(Scans!P:P,Scans!AD:AD,TRUE,Scans!P:P,"<>"),"")'],
    ['Gemiddeld Technologie & Veiligheid', '=IFERROR(AVERAGEIFS(Scans!Q:Q,Scans!AD:AD,TRUE,Scans!Q:Q,"<>"),"")'],
    ['Gemiddeld Medewerkers zelfredzaamheid', '=IFERROR(AVERAGEIFS(Scans!R:R,Scans!AD:AD,TRUE,Scans!R:R,"<>"),"")'],
    ['', ''],
    ['Totaal voordeel 3 jaar (alle scans, excl. import)', '=SUMIFS(Scans!V:V,Scans!D:D,"<>import")'],
    ['Gemiddeld voordeel 3 jaar per scan', '=IFERROR(AVERAGEIFS(Scans!V:V,Scans!D:D,"<>import",Scans!V:V,">0"),"")'],
    ['', ''],
    ['Per consultant', ''],
    ['=IFERROR(QUERY(Scans!A:AE,"select F, count(A), avg(N), sum(V) where D = \'begeleid\' group by F label F \'Consultant\', count(A) \'Scans\', avg(N) \'Gem. score\', sum(V) \'Voordeel 3 jaar\'",1),"Nog geen begeleide scans")', ''],
    ['', ''], ['', ''], ['', ''], ['', ''], ['', ''], ['', ''],
    ['Leads per bron', ''],
    ['=IFERROR(QUERY(Leads!A:J,"select I, count(A) where A is not null group by I label I \'Bron\', count(A) \'Leads\'",1),"Nog geen leads")', '']
  ];
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
  sh.getRange('A1').setFontSize(16).setFontWeight('bold');
  sh.getRange('B10:B14').setNumberFormat('0.00');
  sh.getRange('B16:B17').setNumberFormat('€ #,##0');
  sh.setColumnWidth(1, 340);
  sh.setColumnWidth(2, 160);
}

function zorgVoorMap_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('RAPPORT_MAP_ID');
  if (id) { try { DriveApp.getFolderById(id); return id; } catch (e) { /* opnieuw aanmaken */ } }
  var map = DriveApp.createFolder('Nmbrs Groei Scan · Rapporten');
  props.setProperty('RAPPORT_MAP_ID', map.getId());
  return map.getId();
}

function installeerTriggers_(ss) {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['bijWijzigingSheet_', 'bijOpenenSheet_'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('bijWijzigingSheet_').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('bijOpenenSheet_').forSpreadsheet(ss).onOpen().create();
}

/** Menu in de Sheet voor beheerders. */
function bijOpenenSheet_() {
  SpreadsheetApp.getUi().createMenu('Groei Scan')
    .addItem('Content opnieuw inlezen', 'menuContentVernieuwen')
    .addItem('Benchmark bijwerken', 'menuBenchmarkBijwerken')
    .addSeparator()
    .addItem('Links van de app tonen', 'menuLinks')
    .addToUi();
}

function menuContentVernieuwen() {
  cacheWis_(CACHE_CONTENT);
  SpreadsheetApp.getActive().toast('De app gebruikt vanaf nu de content uit deze Sheet.', 'Groei Scan');
}

function menuBenchmarkBijwerken() {
  cacheWis_(CACHE_BENCHMARK);
  var bm = herberekenBenchmark_(GSCalc.indexeer(laadContent_()));
  SpreadsheetApp.getActive().toast('Benchmark bijgewerkt: ' + bm.n + ' kantoren.', 'Groei Scan');
}

function menuLinks() {
  var url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().alert('Begeleide modus:\n' + url + '\n\nCampagnemodus (gebruik de URL van de campagne-deployment):\n…/exec?modus=campagne&utm_source=…');
}
