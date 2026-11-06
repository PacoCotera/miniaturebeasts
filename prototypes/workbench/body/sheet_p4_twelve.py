"""Pass 4 step 9: the twelve again with the same seeds as pass 3: plush stand pose at az 32 (304 and 96 px), a 48 px tile, az 90 and az 180. Sheet pass4/twelve. Under the bpy venv: python sheet_p4_twelve.py (renders the twelve in parallel, 5 processes)."""
import os, sys, json, subprocess, shutil, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sheetlib as SL
from p4step import PASS4
SUB = os.path.join(PASS4, "twelve")
os.makedirs(SUB, exist_ok=True)
here = os.path.dirname(os.path.abspath(__file__))
t0 = time.time()
todo = list(range(1, 13)); running = []
while todo or running:
    while todo and len(running) < 5:
        i = todo.pop(0)
        running.append(subprocess.Popen([sys.executable, os.path.join(here, "run_p4_ind.py"), str(i), SUB], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
    running = [p for p in running if p.poll() is None]
    time.sleep(2)
cells = []
for i in range(1, 13):
    sd = os.path.join(SUB, f"ind{i:02d}")
    d = json.load(open(os.path.join(sd, "creature.json")))
    c = d["creature"]; s, k = c["shape"], c["coat"]
    ap = c.get("appendages") or {}
    wh = (ap.get("whiskers") or {}).get("count", 0); fg = ap.get("fangs", 0)
    h = (k["hue"] + 360.0 * k["hue_shift"]) % 360.0
    loud = ", ".join(d.get("loud") or []) or "none"
    txt = f"hue {h:.0f}, {s['ear']} ear, {s['tip']} tip, loud: {loud}, whiskers {wh}, fangs {fg}"
    for nm in ("a304", "a96", "a48", "az90", "az180"):
        shutil.copy(os.path.join(sd, nm + ".png"), os.path.join(SUB, f"{i:02d}-{nm}.png"))
    cells.append(f"<div class='cell'><div class='cap'><b>{i}</b> {txt}</div><img src='twelve/{i:02d}-a304.png' width='304'><br>"
                 f"<img src='twelve/{i:02d}-a96.png' width='192' style='image-rendering:pixelated'> <img src='twelve/{i:02d}-a48.png' width='144' style='image-rendering:pixelated'><br>"
                 f"<img src='twelve/{i:02d}-az90.png' width='152'> <img src='twelve/{i:02d}-az180.png' width='152'></div>")
body = ("<h1>S20 Tuliko pass 4: the twelve (same seeds as pass 3)</h1><p>Plush render in the stand pose: the house view (az 32) at 304 px, at 96 px (shown 2x) and as a 48 px tile (shown 3x, pixel-exact), then az 90 and az 180. "
        "At most two loud genes each (coat pattern, glow pattern, emblem, brow), the glow pattern is the firefly arcs, brows are two tufts, whiskers are symmetric sets of two or more or none, warm hues have a dark belly, the muzzle is a tint of the coat's own hue, "
        "the tail is on the midline. Built " + time.strftime("%a %d %b %H:%M") + ".</p>"
        "<div class='grid' style='grid-template-columns:repeat(4,320px)'>" + "".join(cells) + "</div>")
open(os.path.join(PASS4, "twelve.html"), "w").write(SL.page("twelve", body))
SL.shoot(os.path.join(PASS4, "twelve.html"), os.path.join(PASS4, "twelve.png"), 1340)
print("done", round(time.time() - t0))
