"""Quick look: master, SDF (pinned), round 1 and a candidate side by side on the house ground at 304 (and 96, 48 at 3x/4x).  cadvenv python.
python tools/cmp.py CANDIDATE_DIR OUT.png [304|96|48]"""
import sys, os
from PIL import Image
R1 = "/home/mb/mb/iwq/results/T-20261101-mesh/loika/img"
GROUND = (0xD6, 0xCE, 0xBE, 255)
def on(path, zoom):
    im = Image.open(path).convert("RGBA"); bg = Image.new("RGBA", im.size, GROUND); bg.alpha_composite(im)
    return bg.resize((im.width * zoom, im.height * zoom), Image.NEAREST if zoom > 1 else Image.LANCZOS)
cand, out = sys.argv[1], sys.argv[2]
sizes = [int(s) for s in sys.argv[3:]] or [304]
rows = []
for s in sizes:
    z = {304: 1, 96: 3, 48: 5}[s]
    ims = [on(f"{R1}/master-{s}.png", z), on(f"{R1}/sdf-{s}.png", z), on(f"{R1}/s5-loika-{s}.png", z), on(os.path.join(cand, f"loika-{s}.png"), z)]
    W = sum(i.width for i in ims) + 10 * 3; Hh = max(i.height for i in ims)
    row = Image.new("RGBA", (W, Hh), (255, 255, 255, 255)); x = 0
    for i in ims: row.paste(i, (x, 0)); x += i.width + 10
    rows.append(row)
H = sum(r.height for r in rows) + 10 * (len(rows) - 1); W = max(r.width for r in rows)
sheet = Image.new("RGBA", (W, H), (255, 255, 255, 255)); y = 0
for r in rows: sheet.paste(r, (0, y)); y += r.height + 10
sheet.convert("RGB").save(out)
