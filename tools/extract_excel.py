"""Haalt de content en de benchmarkdata uit de Groei Scan MASTER-Excel.

Gebruik:  python3 tools/extract_excel.py <pad-naar-MASTER.xlsx> [uitvoer.json]

Schrijft data/excel_extract.json met:
  - stellingen   (82, letterlijk uit de domeintabbladen, gekoppeld aan hun Typeform-kolom)
  - responses    (46 kantoren, geanonimiseerd: alleen scores, stroken en FTE)
  - urenbenchmark (uren per activiteit uit "Uitkomsten urenbesteding salari", zonder namen)
  - prijzen      (Pricing 26)
  - instellingen (vaste waarden uit "Business Case berekening")
  - featureAdoption

De koppeling stelling -> Typeform-kolom gebeurt op tekst, niet op kolom F van de
domeintabbladen: die loopt vanaf kolom W een kolom achter.
"""
import difflib
import json
import re
import sys
from pathlib import Path

import openpyxl
from openpyxl.utils import get_column_letter, column_index_from_string

DOMAINS = [
    # sheet, id, prefix
    ("Payroll", "payroll", "P"),
    ("HR", "hr", "H"),
    ("Technologie & Veiligheid", "tech", "T"),
    ("Medewerkers zelfredzaamheid", "zelf", "Z"),
]

# Subthema-namen zoals in de Excel, met de korte namen uit het rapporttemplate.
SUBTHEMA = {
    "Automatisering": ("automatisering", "Automatisering"),
    "Flexibiliteit": ("flexibiliteit", "Flexibiliteit"),
    "Efficiëntie": ("efficiency", "Efficiency"),
    "Efficiënte HR-processen": ("hr-processen", "Efficiënte HR-processen"),
    "Verlof- en Verzuimbeheer": ("verlof-verzuim", "Verlof- en Verzuimbeheer"),
    "Persoonlijke Ontwikkeling en Functioneringsgesprekken": ("ontwikkeling", "Persoonlijke Ontwikkeling"),
    "Gebruiksvriendelijkheid en Efficiency": ("hr-efficiency", "Efficiency"),
    "Werving en Selectie": ("werving", "Werving en Selectie"),
    "Security": ("veiligheid", "Veiligheid"),
    "Authenticatie en toegang": ("authenticatie", "Authenticatie en toegang"),
    "Gebruikersgemak": ("gebruikersgemak", "Gebruikersgemak"),
    "Systeemnavigatie en meldingen": ("navigatie", "Systeemnavigatie"),
    "Zelfservice Medewerker": ("zelfservice", "Zelfservice Medewerker"),
    "Communicatie": ("communicatie", "Communicatie"),
    "Declaraties": ("declaraties", "Declaraties"),
}

FIRST_RESPONSE_ROW = 7
COL_STROKEN = "CG"
COL_FTE = "CH"


def norm(s):
    return re.sub(r"[^a-z0-9]", "", str(s).lower())


def clean_text(s):
    """Alleen opmaak normaliseren (aanhalingstekens, witruimte); de woorden blijven gelijk."""
    s = str(s).strip()
    s = s.strip('"“”\'')
    s = s.replace(" ", " ")
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def num(v):
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        try:
            return float(v.replace(",", ".").replace("%", "").strip())
        except ValueError:
            return None
    return None


def extract(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    wbf = openpyxl.load_workbook(path, data_only=False)
    tf = wb["Resultaten Typeform"]

    tf_cols = {}
    for c in range(1, tf.max_column + 1):
        letter = get_column_letter(c)
        if letter in ("CB", "CC", "CD", "CE", "CF", "CG", "CH", "CI"):
            continue
        v = tf.cell(5, c).value
        if v:
            tf_cols[letter] = v

    # Uren per activiteit (gemiddelde rij 2), kolomletter -> uren per maand
    uren_ws = wb["Uitkomsten urenbesteding salari"]
    uren_cols = {}
    for c in range(1, 27):
        letter = get_column_letter(c)
        uren_cols[letter] = {
            "vraag": clean_text(uren_ws.cell(3, c).value or ""),
            "label": str(uren_ws.cell(1, c).value),
            "waarden": [],
        }
    for r in range(4, uren_ws.max_row + 1):
        if not any(isinstance(uren_ws.cell(r, c).value, (int, float)) for c in range(1, 27)):
            continue
        for c in range(1, 27):
            v = uren_ws.cell(r, c).value
            uren_cols[get_column_letter(c)]["waarden"].append(v if isinstance(v, (int, float)) else None)

    stellingen = []
    used = {}
    for sheet, dom_id, prefix in DOMAINS:
        ws = wb[sheet]
        wsf = wbf[sheet]
        sub = None
        volgnr = 0
        for r in range(3, ws.max_row + 1):
            b = ws.cell(r, 2).value
            if b and "AVERAGE" not in str(b):
                sub = str(b).strip().rstrip(":").strip()
            d = ws.cell(r, 4).value
            if not d or not sub:
                continue
            volgnr += 1
            best_col, best_ratio = None, 0.0
            for letter, text in tf_cols.items():
                ratio = difflib.SequenceMatcher(None, norm(d), norm(text)).ratio()
                if ratio > best_ratio:
                    best_col, best_ratio = letter, ratio
            if best_ratio < 0.7:
                raise SystemExit(f"Geen Typeform-kolom gevonden voor {sheet} rij {r}: {d}")
            if best_col in used:
                raise SystemExit(f"Typeform-kolom {best_col} dubbel gebruikt ({used[best_col]} en {sheet}{r})")
            used[best_col] = f"{sheet}!{r}"

            # Urenkoppeling (alleen Payroll): formule in kolom K
            uren_col = None
            if dom_id == "payroll":
                kf = wsf.cell(r, 11).value
                m = re.search(r"urenbesteding salari'!([A-Z]+)2", str(kf or ""))
                if m:
                    uren_col = m.group(1)

            sub_id, sub_kort = SUBTHEMA[sub]
            nr = ws.cell(r, 3).value
            stellingen.append({
                "id": f"{prefix}{volgnr:02d}",
                "domein": dom_id,
                "subthema": sub_id,
                "subthemaNaam": sub_kort,
                "subthemaVolledig": sub,
                "nrExcel": int(nr) if isinstance(nr, (int, float)) else None,
                "typeformKolom": best_col,
                "stelling": clean_text(d),
                # Lege oplossing in het domeintabblad: de toelichting uit de Typeform (rij 6) gebruiken.
                "oplossing": clean_text(ws.cell(r, 8).value or tf[f"{best_col}6"].value or ""),
                "doelscore": num(ws.cell(r, 7).value),
                "urenKolom": uren_col,
                "opmerkingExcel": clean_text(ws.cell(r, 6).value) if ws.cell(r, 6).value and len(str(ws.cell(r, 6).value)) > 3 else None,
            })

    # Antwoorden van de kantoren, geanonimiseerd
    responses = []
    for r in range(FIRST_RESPONSE_ROW, tf.max_row + 1):
        scores = {}
        for s in stellingen:
            v = tf.cell(r, column_index_from_string(s["typeformKolom"])).value
            v = num(v)
            if v is not None and 1 <= v <= 5:
                scores[s["id"]] = v
        if not scores:
            continue
        stroken = num(tf[f"{COL_STROKEN}{r}"].value)
        fte = num(tf[f"{COL_FTE}{r}"].value)
        responses.append({
            "id": f"TF-{len(responses) + 1:02d}",
            "bron": "Typeform 2025",
            "strokenPerMaand": stroken,
            "fte": fte,
            "scores": scores,
        })

    # Uren per activiteit: alleen de kolommen die aan een stelling hangen
    urenbenchmark = []
    for letter, col in uren_cols.items():
        vals = [v for v in col["waarden"] if v is not None]
        urenbenchmark.append({
            "kolom": letter,
            "label": col["label"],
            "vraag": col["vraag"],
            "waarden": vals,
            "gemiddeldUrenPerMaand": sum(vals) / len(vals) if vals else 0,
        })

    # Business case-instellingen
    bc = wb["Business Case berekening"]
    instellingen = {
        "salarisAdministrateurMaand": 3540,
        "werkgeverslastenFactor": 1.3,
        "aandeelSalarisverwerking": num(bc["C15"].value),
        "softwarekostenPerStrook": num(bc["F6"].value),
        "conversieInvestering": num(bc["C11"].value),
        "efficiencyMetNmbrs": [num(bc["N15"].value), num(bc["N16"].value), num(bc["N17"].value)],
        "efficiencyZonderNmbrs": [num(bc["O15"].value), num(bc["O16"].value), num(bc["O17"].value)],
        "potentieStrokenPerFte": num(wb["Feature Adoption"]["E19"].value),
        "voorbeeld": {"fte": num(bc["C6"].value), "strokenPerMaand": num(bc["C7"].value)},
        "controle": {
            "voordeel": [num(bc["N13"].value), num(bc["O13"].value), num(bc["P13"].value)],
            "huidigeKosten": [num(bc["N10"].value), num(bc["O10"].value), num(bc["P10"].value)],
            "nieuweKosten": [num(bc["N11"].value), num(bc["O11"].value), num(bc["P11"].value)],
            "inefficientiePerStrook": num(bc["I13"].value),
        },
    }

    # Feature adoption
    fa = wb["Feature Adoption"]
    feature_adoption = []
    for r in range(5, 15):
        feature_adoption.append({
            "feature": clean_text(fa.cell(r, 2).value),
            "huidig": num(fa.cell(r, 3).value),
            "gemiddeldNL": num(fa.cell(r, 4).value),
            "beste": num(fa.cell(r, 5).value),
        })

    # Prijzen (Pricing 26)
    pr = wb["Pricing 26"]
    pakketten = []
    for r in range(9, 17):
        pakketten.append({
            "naam": pr.cell(r, 1).value,
            "inbegrepen": num(pr.cell(r, 2).value),
            "prijs": num(pr.cell(r, 3).value),
            "prijsExtraStrook": num(pr.cell(r, 4).value),
        })
    startpakketten = []
    for r in range(19, 26):
        startpakketten.append({
            "totStroken": pr.cell(r, 1).value,
            "kickstart": pr.cell(r, 2).value,
            "upGoEssential": num(pr.cell(r, 3).value),
            "upGoAdvanced": num(pr.cell(r, 4).value),
            "upGoHr": num(pr.cell(r, 5).value),
        })

    def staffel(start_row):
        rows = []
        r = start_row
        while True:
            prijs, van, tot = pr.cell(r, 13).value, pr.cell(r, 14).value, pr.cell(r, 15).value
            if van is None and tot is None:
                break
            rows.append({"prijs": num(prijs) if num(prijs) is not None else str(prijs), "van": num(van), "tot": num(tot)})
            r += 1
        return rows

    prijzen = {
        "pakketten": pakketten,
        "startpakketten": startpakketten,
        "perform": staffel(2),
        "hire": staffel(15),
        "expense": staffel(23),
        "pay": staffel(38),
        "engage": staffel(42),
        "hireVacatureAandeel": 0.05,
    }

    return {
        "bron": Path(path).name,
        "stellingen": stellingen,
        "responses": responses,
        "urenbenchmark": urenbenchmark,
        "instellingen": instellingen,
        "featureAdoption": feature_adoption,
        "prijzen": prijzen,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    out = Path(sys.argv[2] if len(sys.argv) > 2 else Path(__file__).resolve().parent.parent / "data" / "excel_extract.json")
    data = extract(sys.argv[1])
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1))
    print(f"{len(data['stellingen'])} stellingen, {len(data['responses'])} kantoren -> {out}")
