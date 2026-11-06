"""Pass 3 step 7: the twelve again in the plush render at the house view (az 32, 304 and 96) and from directly behind (az 180), with whiskers, fangs and the glowing pattern gene as drawn. Under the bpy venv: python sheet_p3_twelve.py (renders the twelve in parallel, 4 processes)."""
import os, sys, json, subprocess, shutil, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sheetlib as SL
OUT = "/home/mb/mb/iwq/results/T-20261101-mesh/newspecies/build/pass3"
SUB = os.path.join(OUT, "twelve")
os.makedirs(SUB, exist_ok=True)
here = os.path.dirname(os.path.abspath(__file__))
t0 = time.time()
procs = []
todo = list(range(1, 13))
running = []
while todo or running:
    while todo and len(running) < 4:
        i = todo.pop(0)
        running.append(subprocess.Popen([sys.executable, os.path.join(here, "run_p3_ind.py"), str(i), SUB], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
    running = [p for p in running if p.poll() is None]
    time.sleep(2)
cells = []
for i in range(1, 13):
    sd = os.path.join(SUB, f"ind{i:02d}")
    c = json.load(open(os.path.join(sd, "creature.json")))["creature"]
    s, k = c["shape"], c["coat"]
    ap = c.get("appendages") or {}
    wh = (ap.get("whiskers") or {}).get("count", 0); fg = ap.get("fangs", 0)
    h = (k["hue"] + 360.0 * k["hue_shift"]) % 360.0
    txt = f"hue {h:.0f}, {s['ear']} ear, {s['tip']} tip, glow pattern {k.get('glow_pattern', 'none')}, whiskers {wh}, fangs {fg}"
    for nm in ("a304", "a96", "back"):
        shutil.copy(os.path.join(sd, nm + ".png"), os.path.join(SUB, f"{i:02d}-{nm}.png"))
    cells.append(f"<div class='cell'><div class='cap'><b>{i}</b> {txt}</div><img src='twelve/{i:02d}-a304.png' width='304'><br><img src='twelve/{i:02d}-a96.png' width='192' style='image-rendering:pixelated'> <img src='twelve/{i:02d}-back.png' width='190'></div>")
body = ("<h1>S20 Tuliko pass 3, step 7: the twelve</h1><p>Plush render in the stand pose: the house view (az 32) at 304 px, the 96 px render at 2x (pixel-exact), and the view from directly behind (az 180). Whiskers, fangs and the glowing pattern gene as drawn for each individual.</p>"
        "<div class='grid' style='grid-template-columns:repeat(4,320px)'>" + "".join(cells) + "</div>")
open(os.path.join(OUT, "twelve.html"), "w").write(SL.page("twelve", body))
SL.shoot(os.path.join(OUT, "twelve.html"), os.path.join(OUT, "twelve.png"), 1340)
print("done", round(time.time() - t0))
