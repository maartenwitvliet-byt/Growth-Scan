/**
 * Functies die de browser aanroept via google.script.run.
 * Alles wat met klantdata in de begeleide modus te maken heeft, controleert
 * op de server opnieuw of de gebruiker een actieve consultant is.
 */

var MAX_SCAN_BYTES = 200000;

function api_scanOpslaan(scan) {
  var ctx = valideerScan_(scan);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var bestaand = scan.id ? leesScan_(scan.id) : null;
    if (bestaand) bewaakEigenaar_(bestaand, ctx, scan);
    if (!bestaand && ctx.modus === 'campagne') scan.sleutel = Utilities.getUuid();
    var nu = new Date().toISOString();
    scan.id = scan.id || nieuwId_(ctx.modus);
    scan.aangemaakt = (bestaand && bestaand.aangemaakt) || scan.aangemaakt || nu;
    scan.gewijzigd = nu;
    scan.modus = ctx.modus;
    scan.consultant = ctx.consultant ? ctx.consultant.email : '';
    if (bestaand) {
      // Velden die alleen de server zet, niet door de browser laten overschrijven.
      scan.rapport = bestaand.rapport || scan.rapport;
      scan.hubspot = bestaand.hubspot || scan.hubspot;
    }
    scan.status = scan.status === 'afgerond' ? 'afgerond' : 'concept';
    var content = GSCalc.indexeer(laadContent_());
    schrijfScanRij_(scan, GSCalc.analyse(content, scan));
    return { id: scan.id, gewijzigd: scan.gewijzigd, aangemaakt: scan.aangemaakt, sleutel: scan.sleutel || null };
  } finally {
    lock.releaseLock();
  }
}

/** Afronden: antwoorden gaan de benchmark in. Geeft de nieuwe benchmark terug. */
function api_scanAfronden(scan) {
  scan.status = 'afgerond';
  var res = api_scanOpslaan(scan);
  var content = GSCalc.indexeer(laadContent_());
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    schrijfAntwoorden_(scan, content);
  } finally {
    lock.releaseLock();
  }
  cacheWis_(CACHE_BENCHMARK);
  res.benchmark = herberekenBenchmark_(content);
  return res;
}

function api_scanLaden(id) {
  var c = vereisConsultant_();
  var scan = leesScan_(id);
  if (!scan) throw new Error('Scan niet gevonden.');
  if (scan.modus === 'begeleid' && scan.consultant && scan.consultant !== c.email && c.rol !== 'beheerder') {
    throw new Error('Deze scan is van een andere consultant.');
  }
  return scan;
}

/** Overzicht voor het startscherm van de consultant (beheerders zien alles). */
function api_mijnScans() {
  var c = vereisConsultant_();
  var values = tab_('scans').getDataRange().getValues();
  var head = values[0];
  var idx = {};
  head.forEach(function (h, i) { idx[h] = i; });
  var out = [];
  for (var r = values.length - 1; r >= 1; r--) {
    var row = values[r];
    if (row[idx.modus] !== 'begeleid') continue;
    if (c.rol !== 'beheerder' && String(row[idx.consultant]).toLowerCase() !== c.email) continue;
    out.push({
      id: row[idx.id], kantoor: row[idx.kantoor], status: row[idx.status], gewijzigd: row[idx.gewijzigd],
      consultant: row[idx.consultant], score: row[idx.score_totaal], voordeel: row[idx.voordeel_totaal],
      domeinen: row[idx.domeinen], slidesUrl: row[idx.slidesUrl], pdfUrl: row[idx.pdfUrl]
    });
    if (out.length >= 200) break;
  }
  return out;
}

/** Campagnemodus: contactgegevens opslaan (tabblad Leads) en naar HubSpot. */
function api_leadOpslaan(scan, lead) {
  if (!lead || !lead.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(lead.email))) throw new Error('Vul een geldig e-mailadres in.');
  if (!lead.toestemming) throw new Error('Geef toestemming om contact op te nemen.');
  if (lead.website) return { ok: true }; // honeypot: bots vullen dit verborgen veld
  scan.lead = { naam: tekst_(lead.naam, 120), organisatie: tekst_(lead.organisatie, 160), functie: tekst_(lead.functie, 120), email: tekst_(lead.email, 160).toLowerCase(), telefoon: tekst_(lead.telefoon, 40), toestemming: true, datum: new Date().toISOString() };
  scan.kantoor = scan.kantoor || {};
  scan.kantoor.naam = scan.kantoor.naam || scan.lead.organisatie;
  scan.kantoor.contactNaam = scan.lead.naam;
  scan.kantoor.contactEmail = scan.lead.email;
  var res = api_scanAfronden(scan);
  scan.id = res.id;

  var hubspotContactId = '';
  try {
    var hs = hubspotSyncScan_(scan);
    hubspotContactId = hs && hs.contactId || '';
  } catch (e) {
    console.error('HubSpot-sync mislukt: ' + e);
  }
  tab_('leads').appendRow([new Date(), scan.id, scan.lead.naam, scan.lead.organisatie, scan.lead.functie, scan.lead.email, scan.lead.telefoon, true, bronTekst_(scan.bron), hubspotContactId]);
  res.ok = true;
  return res;
}

/** Begeleide modus: scan naar HubSpot (bedrijf, contact en notitie; geen deal). */
function api_hubspotSync(scanId) {
  vereisConsultant_();
  var scan = leesScan_(scanId);
  if (!scan) throw new Error('Sla de scan eerst op.');
  var res = hubspotSyncScan_(scan);
  scan.hubspot = { companyId: res.companyId, contactId: res.contactId, noteId: res.noteId, gesynchroniseerd: new Date().toISOString() };
  var content = GSCalc.indexeer(laadContent_());
  schrijfScanRij_(scan, GSCalc.analyse(content, scan));
  return scan.hubspot;
}

function api_hubspotZoekBedrijf(zoekterm) {
  vereisConsultant_();
  return hubspotZoekBedrijven_(String(zoekterm || '').slice(0, 80));
}

/** Begeleide modus: Google Slides en PDF maken uit het mastertemplate. */
function api_slidesMaken(scanId, grafieken) {
  var c = vereisConsultant_();
  var scan = leesScan_(scanId);
  if (!scan) throw new Error('Sla de scan eerst op.');
  var content = GSCalc.indexeer(laadContent_());
  var analyse = GSCalc.analyse(content, scan, laadBenchmark_(content));
  var res = maakSlides_(scan, analyse, content, grafieken || {}, c);
  scan.rapport = { slidesUrl: res.slidesUrl, pdfUrl: res.pdfUrl, slidesId: res.slidesId, gemaakt: new Date().toISOString() };
  schrijfScanRij_(scan, analyse);
  return scan.rapport;
}

// ------------------------------------------------------------------
// Hulpfuncties
// ------------------------------------------------------------------
function valideerScan_(scan) {
  if (!scan || typeof scan !== 'object') throw new Error('Geen scan ontvangen.');
  if (JSON.stringify(scan).length > MAX_SCAN_BYTES) throw new Error('De scan is te groot om op te slaan.');
  var email = '';
  try { email = (Session.getActiveUser().getEmail() || '').toLowerCase(); } catch (e) { email = ''; }
  var consultant = email ? zoekConsultant_(email) : null;
  var modus = scan.modus === 'begeleid' ? 'begeleid' : 'campagne';
  if (modus === 'begeleid' && !consultant) throw new Error('Geen toegang: log in met een Nmbrs-account dat in het tabblad Consultants staat.');
  // Antwoorden opschonen: alleen bestaande stellingen met een score van 1 tot 5.
  var bekend = {};
  laadContent_().stellingen.forEach(function (s) { bekend[s.id] = true; });
  var schoon = {};
  Object.keys(scan.antwoorden || {}).forEach(function (id) {
    var v = Number(scan.antwoorden[id]);
    if (bekend[id] && v >= 1 && v <= 5) schoon[id] = Math.round(v);
  });
  scan.antwoorden = schoon;
  scan.domeinen = (scan.domeinen || []).filter(function (d) { return ['payroll', 'hr', 'tech', 'zelf'].indexOf(d) >= 0; });
  scan.taal = scan.taal === 'en' ? 'en' : 'nl';
  if (scan.kantoor) {
    ['naam', 'website', 'contactNaam', 'contactEmail', 'contactTelefoon', 'hubspotCompanyId'].forEach(function (k) {
      if (scan.kantoor[k] !== undefined) scan.kantoor[k] = tekst_(scan.kantoor[k], 200);
    });
  }
  if (modus === 'campagne') { delete scan.rapport; delete scan.hubspot; }
  return { modus: modus, consultant: consultant };
}

function bewaakEigenaar_(bestaand, ctx, scan) {
  if (bestaand.modus === 'begeleid') {
    if (!ctx.consultant) throw new Error('Geen toegang tot deze scan.');
    if (bestaand.consultant && bestaand.consultant !== ctx.consultant.email && ctx.consultant.rol !== 'beheerder') throw new Error('Deze scan is van een andere consultant.');
  } else {
    if (ctx.modus === 'begeleid') throw new Error('Een campagnescan kan niet in de begeleide modus worden overschreven.');
    // Campagne: alleen wie de geheime sleutel van de eerste opslag heeft, mag de scan bijwerken.
    if (!bestaand.sleutel || scan.sleutel !== bestaand.sleutel) throw new Error('Geen toegang tot deze scan.');
  }
}

function nieuwId_(modus) {
  var d = Utilities.formatDate(new Date(), 'Europe/Amsterdam', 'yyMMdd');
  return (modus === 'begeleid' ? 'GS-' : 'GC-') + d + '-' + Utilities.getUuid().slice(0, 6).toUpperCase();
}

function tekst_(v, max) {
  return String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max || 200);
}
