/**
 * Google Slides-export uit het mastertemplate.
 *
 * Script Properties:
 *   SLIDES_TEMPLATE_ID     id van het master-Slides-bestand (Nederlands)
 *   SLIDES_TEMPLATE_ID_EN  optioneel: Engelse versie van het template
 *   RAPPORT_MAP_ID         Drive-map voor de rapporten (maakt setup() aan)
 *
 * In het template (zie docs/SLIDES-TEMPLATE.md):
 *   - tekst-placeholders zoals {{klantnaam}} of {{payroll_jij}} worden vervangen;
 *   - een afbeelding of vorm met alt-tekst (titel) "grafiek:radar-totaal" wordt
 *     vervangen door de grafiek uit de app;
 *   - een slide met [[domein:hr]] in de sprekersnotities verdwijnt als HR niet
 *     is gescoord. Zonder notities herkent de export de domeinslides aan hun titel.
 */

function maakSlides_(scan, analyse, content, grafieken, consultant) {
  var props = PropertiesService.getScriptProperties();
  var taal = scan.taal === 'en' ? 'en' : 'nl';
  var templateId = (taal === 'en' && props.getProperty('SLIDES_TEMPLATE_ID_EN')) || props.getProperty('SLIDES_TEMPLATE_ID');
  if (!templateId) throw new Error('Het Slides-template is nog niet ingesteld (Script Property SLIDES_TEMPLATE_ID).');
  var map = DriveApp.getFolderById(zorgVoorMap_());
  var datum = Utilities.formatDate(new Date(), 'Europe/Amsterdam', 'yyyy-MM-dd');
  var naam = (taal === 'en' ? 'Growth report' : 'Groeirapport') + ' - ' + ((scan.kantoor || {}).naam || scan.id) + ' - ' + datum;

  var kopie = DriveApp.getFileById(templateId).makeCopy(naam, map);
  var pres = SlidesApp.openById(kopie.getId());

  // 1. Slides verwijderen voor domeinen die niet zijn gescoord.
  verwijderOngebruikteSlides_(pres, scan, content);

  // 2. Tekst-placeholders.
  var waarden = slidesPlaceholders_(scan, analyse, content, taal, consultant);
  Object.keys(waarden).forEach(function (k) {
    pres.replaceAllText('{{' + k + '}}', String(waarden[k]));
  });

  // 3. Grafieken op elementen met alt-tekst "grafiek:<sleutel>".
  pres.getSlides().forEach(function (slide) {
    slide.getPageElements().forEach(function (el) {
      var tag = String(el.getTitle() || el.getDescription() || '').trim();
      var m = tag.match(/^grafiek:([\w-]+)$/i);
      if (!m || !grafieken[m[1]]) return;
      var blob = dataUrlNaarBlob_(grafieken[m[1]], m[1] + '.png');
      if (el.getPageElementType() === SlidesApp.PageElementType.IMAGE) {
        el.asImage().replace(blob, false);
      } else {
        var img = slide.insertImage(blob, el.getLeft(), el.getTop(), el.getWidth(), el.getHeight());
        img.setTitle(tag);
        el.remove();
      }
    });
  });

  pres.saveAndClose();
  var pdf = map.createFile(kopie.getAs(MimeType.PDF)).setName(naam + '.pdf');
  return { slidesId: kopie.getId(), slidesUrl: kopie.getUrl(), pdfUrl: pdf.getUrl() };
}

function dataUrlNaarBlob_(dataUrl, naam) {
  var m = String(dataUrl).match(/^data:(image\/(?:png|jpeg));base64,(.+)$/);
  if (!m) throw new Error('Ongeldige grafiek: ' + naam);
  return Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], naam);
}

function verwijderOngebruikteSlides_(pres, scan, content) {
  var gekozen = {};
  (scan.domeinen || []).forEach(function (d) { gekozen[d] = true; });
  var titels = {};
  content.domeinen.forEach(function (d) {
    titels[String(d.rapport_nl).toLowerCase()] = d.id;
    titels[String(d.rapport_en).toLowerCase()] = d.id;
  });
  pres.getSlides().forEach(function (slide) {
    var notities = '';
    try { notities = slide.getNotesPage().getSpeakerNotesShape().getText().asString(); } catch (e) { notities = ''; }
    var m = notities.match(/\[\[domein:(\w+)\]\]/);
    var domein = m ? m[1] : null;
    if (!domein) {
      // Herkennen aan de titel: een tekstvak dat precies de domeinnaam is, op een "Resultaten"-slide.
      var teksten = slide.getShapes().map(function (s) { try { return s.getText().asString().trim().toLowerCase(); } catch (e) { return ''; } });
      var isResultaat = teksten.some(function (t) { return t === 'resultaten' || t === 'results'; });
      if (isResultaat) teksten.forEach(function (t) { if (titels[t]) domein = titels[t]; });
    }
    if (domein && !gekozen[domein]) slide.remove();
  });
}

function slidesPlaceholders_(scan, a, content, taal, consultant) {
  var nl = taal !== 'en';
  function sc(v) { return typeof v === 'number' && isFinite(v) ? v.toFixed(1).replace('.', nl ? ',' : '.') : '–'; }
  function eur(v, dec) {
    if (typeof v !== 'number' || !isFinite(v)) return '–';
    var s = v.toFixed(dec || 0);
    var delen = s.split('.');
    delen[0] = delen[0].replace(/\B(?=(\d{3})+(?!\d))/g, nl ? '.' : ',');
    return '€ ' + delen.join(nl ? ',' : '.');
  }
  function num(v, dec) {
    if (typeof v !== 'number' || !isFinite(v)) return '–';
    var s = v.toFixed(dec || 0).split('.');
    s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, nl ? '.' : ',');
    return s.join(nl ? ',' : '.');
  }
  var bm = a.benchmark || { domein: {}, subthema: {}, totaal: {}, strokenPerFte: {} };
  var k = scan.kantoor || {};
  var w = {
    klantnaam: k.naam || '',
    datum: Utilities.formatDate(new Date(), 'Europe/Amsterdam', 'd-M-yyyy'),
    versie: content.instellingen.rapportVersie || 'Nmbrs ACC Groei Scan FULL',
    consultant: consultant ? consultant.naam : '',
    contactpersoon: k.contactNaam || '',
    totaal_jij: sc(a.scores.totaal), totaal_gem: sc(bm.totaal.gem), totaal_beste: sc(bm.totaal.beste),
    benchmark_aantal: bm.n || ''
  };
  content.domeinen.forEach(function (d) {
    w[d.id + '_jij'] = sc(a.scores.domein[d.id]);
    w[d.id + '_gem'] = sc((bm.domein[d.id] || {}).gem);
    w[d.id + '_beste'] = sc((bm.domein[d.id] || {}).beste);
    d.subthemas.forEach(function (s) {
      var key = s.replace(/-/g, '_');
      w[key + '_jij'] = sc(a.scores.subthema[s]);
      w[key + '_gem'] = sc((bm.subthema[s] || {}).gem);
      w[key + '_beste'] = sc((bm.subthema[s] || {}).beste);
    });
  });
  var p = a.businessCase && a.businessCase.payroll;
  w.stroken_jij = p ? num(p.strokenPerFte) : '–';
  w.stroken_gem = num(bm.strokenPerFte && bm.strokenPerFte.gemiddeld);
  w.stroken_potentie = num(content.instellingen.potentieStrokenPerFte);
  [0, 1, 2].forEach(function (i) {
    var n = i + 1;
    var j = p ? p.jaren[i] : null;
    w['kostprijs_huidig_' + n] = j ? eur(j.huidigPerStrook, 2) : '–';
    w['kostprijs_nmbrs_' + n] = j ? eur(j.nieuwPerStrook, 2) : '–';
    w['stroken_huidig_' + n] = j ? num(j.strokenPerFteZonder) : '–';
    w['stroken_nmbrs_' + n] = j ? num(j.strokenPerFteMet) : '–';
    w['fte_huidig_' + n] = j ? num(j.fteZonder, 2) : '–';
    w['fte_nmbrs_' + n] = j ? num(j.fteMet, 2) : '–';
    w['kosten_huidig_' + n] = j ? eur(j.huidigeKosten, 2) : '–';
    w['kosten_nieuw_' + n] = j ? eur(j.nieuweKosten, 2) : '–';
    w['conversie_' + n] = j ? eur(j.investering, 2) : '–';
    w['voordeel_' + n] = j ? eur(j.voordeel, 2) : '–';
    w['voordeel_totaal_' + n] = a.businessCase ? eur(a.businessCase.jaren[i].voordeel) : '–';
  });
  function som(f) { return p ? p.jaren.reduce(function (s, j) { return s + j[f]; }, 0) : null; }
  w.kosten_huidig_totaal = p ? eur(som('huidigeKosten'), 2) : '–';
  w.kosten_nieuw_totaal = p ? eur(som('nieuweKosten'), 2) : '–';
  w.conversie_totaal = p ? eur(som('investering'), 2) : '–';
  w.voordeel_totaal = p ? eur(som('voordeel'), 2) : '–';
  w.voordeel_alles = a.businessCase ? eur(a.businessCase.totaalVoordeel) : '–';

  (a.kansen || []).concat([{}, {}, {}, {}, {}]).slice(0, 5).forEach(function (kans, i) {
    var f = kans.functie ? content.functies[kans.functie] : null;
    w['kans' + (i + 1) + '_titel'] = f ? (nl ? f.nl : f.en) : '';
    w['kans' + (i + 1) + '_tekst'] = f ? (nl ? f.beschrijving_nl : f.beschrijving_en) : '';
  });

  // Prijzen, zoals in het template: {{ASS}}, {{PN}}, {{IP}}, {{TPP}}, {{PEX}}, {{PEN}}, {{PPE}}, {{PHI}}
  var pr = a.prijs;
  function optie(x) { return x ? (x.opAanvraag ? (nl ? 'Op aanvraag' : 'On request') : eur(x.prijs)) : '–'; }
  w.ASS = pr ? num(pr.stroken) : '–';
  w.PN = pr ? pr.pakket.naam : '–';
  w.IP = pr ? num(pr.pakket.inbegrepen) : '–';
  w.TPP = pr ? eur(pr.pakket.totaal) : '–';
  w.PEX = pr ? optie(pr.add.expense) : '–';
  w.PEN = pr ? optie(pr.add.engage) : '–';
  w.PPE = pr ? optie(pr.add.perform) : '–';
  w.PHI = pr ? optie(pr.add.hire) : '–';
  w.totaal_per_maand = pr ? eur(pr.totaalMaand) : '–';
  return w;
}
