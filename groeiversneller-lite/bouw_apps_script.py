"""Bouwt de Apps Script-versie uit index.html.

index.html is de bron (ook lokaal te openen om te testen). Omdat het één groot bestand
is en dat bij kopiëren en plakken makkelijk wordt afgekapt, splitst dit script het in
vijf kleinere HTML-bestanden voor Google Apps Script:

  index  - de pagina zelf (opmaak), voegt de andere drie in
  stijl  - de vormgeving (CSS)
  beeld  - het campagnebeeld
  data   - de thema's en stellingen
  app    - de werking (JavaScript)

Daarnaast maakt het web/index.html: de app als losse webpagina voor een eigen adres
(bijv. groeiversneller.nmbrs.com). Die stuurt de gegevens naar de Apps Script-webapp
op OPSLAG_URL hieronder, en komt zo in dezelfde Google Sheet.

Gebruik:  python3 bouw_apps_script.py
Resultaat: de map apps-script/ (samen met Code.gs klaar om te plakken) en web/index.html.
"""
import pathlib, re, shutil

# De /exec-URL van de Apps Script-webapp (Implementeren > Implementaties beheren).
OPSLAG_URL = "https://script.google.com/macros/s/AKfycbwV_7di3c57Di7x-8IcbW7V2XSPUYkPgCMjxRnwZembEubjIu72hnCOEKs6H2vFY28oAw/exec"

hier = pathlib.Path(__file__).parent
bron = (hier / "index.html").read_text(encoding="utf8")
uit = hier / "apps-script"
uit.mkdir(exist_ok=True)

def blok(patroon):
    m = re.search(patroon, bron, re.S)
    assert m, patroon
    return m

stijl = blok(r"<style>.*?</style>")
beeld = blok(r"<script>\n// Campagnebeeld.*?</script>")
data = blok(r"<script>\n// Groeiversneller Lite - datamodel.*?</script>")
app = blok(r"<script>\n/\* Groei Versneller - app logica.*?</script>")

delen = {"stijl": stijl.group(0), "beeld": beeld.group(0), "data": data.group(0), "app": app.group(0)}
pagina = bron
for naam, inhoud in delen.items():
    pagina = pagina.replace(inhoud, "<?!= include('%s'); ?>" % naam, 1)
assert "<?" not in bron, "index.html mag geen '<?' bevatten (Apps Script-templates)"

# Eindmarkeringen zijn echte code, geen commentaar: Apps Script laat bij het inlezen
# HTML-commentaar, CSS-commentaar en <?...?> weg, dus een markering in commentaar verdwijnt.
eindes = {
    "stijl": ("</style>", ".gv-einde-stijl { display: none; }\n</style>"),
    "beeld": ("</script>", "window.__GV_EINDE_BEELD = true;\n</script>"),
    "data": ("</script>", "window.__GV_EINDE_DATA = true;\n</script>"),
    "app": ("</script>", "window.__GV_EINDE_APP = true;\n</script>"),
}
(uit / "index.html").write_text(pagina, encoding="utf8")
for naam, inhoud in delen.items():
    oud, nieuw = eindes[naam]
    assert inhoud.endswith(oud)
    (uit / (naam + ".html")).write_text(inhoud[: -len(oud)] + nieuw + "\n", encoding="utf8")

for f in sorted(uit.glob("*.html")):
    print("%-12s %7d tekens" % (f.name, len(f.read_text(encoding="utf8"))))

# Webversie voor een eigen adres
web = hier / "web"
web.mkdir(exist_ok=True)
leeg = 'const OPSLAG_URL = "";'
assert bron.count(leeg) == 1
(web / "index.html").write_text(bron.replace(leeg, 'const OPSLAG_URL = "%s";' % OPSLAG_URL), encoding="utf8")
print("web/index.html %7d tekens (opslag via %s...)" % (len((web / "index.html").read_text(encoding="utf8")), OPSLAG_URL[:45]))
