"""Bouwt de Apps Script-versie uit index.html.

index.html is de bron (ook lokaal te openen om te testen). Omdat het één groot bestand
is en dat bij kopiëren en plakken makkelijk wordt afgekapt, splitst dit script het in
vijf kleinere HTML-bestanden voor Google Apps Script:

  index  - de pagina zelf (opmaak), voegt de andere drie in
  stijl  - de vormgeving (CSS)
  beeld  - het campagnebeeld
  data   - de thema's en stellingen
  app    - de werking (JavaScript)

Gebruik:  python3 bouw_apps_script.py
Resultaat: de map apps-script/ (samen met Code.gs klaar om te plakken).
"""
import pathlib, re, shutil

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
