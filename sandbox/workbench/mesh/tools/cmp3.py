"""Round 3 quick look (cadvenv python): master, SDF (fc80e5312), mesh round 2 (the composites of its sheet, brought back to 1x) and a candidate, on the house ground, at 304 / 96 / 48.
python tools/cmp3.py CANDIDATE_DIR OUT.png [304|96|48 ...]    SDFDIR (env, default out/r3/sdf) holds sdf-S01-*.png"""
import sys, os
from PIL import Image
R1 = "/home/mb/mb/iwq/results/T-20261101-mesh/loika/img"
R2 = "/home/mb/mb/iwq/results/T-20261101-mesh/loika/round2/img"
SDF = os.environ.get("SDFDIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../out/r3/sdf"))
GROUND = (0xD6, 0xCE, 0xBE, 255)
Z = {304: 1, 96: 3, 48: 5}
def on(path, zoom):
    im = Image.open(path).convert("RGBA"); bg = Image.new("RGBA", im.size, GROUND); bg.alpha_composite(im)
    return bg.resize((im.width * zoom, im.height * zoom), Image.NEAREST if zoom > 1 else Image.LANCZOS)
def r2(s):
    im = Image.open(f"{R2}/cmp-r2-{s}-g.png").convert("RGB"); z = Z[s]
    return im if z == 1 else im.resize((im.width // z, im.height // z), Image.NEAREST).convert("RGBA").resize(im.size, Image.NEAREST)
if __name__ == "__main__":
    cand, out = sys.argv[1], sys.argv[2]
    sizes = [int(s) for s in sys.argv[3:]] or [304]
    rows = []
    for s in sizes:
        z = Z[s]
        ims = [on(f"{R1}/master-{s}.png", z), on(f"{SDF}/sdf-S01-{s}.png", z), r2(s).convert("RGBA"), on(os.path.join(cand, f"loika-{s}.png"), z)]
        W = sum(i.width for i in ims) + 10 * 3; Hh = max(i.height for i in ims)
        row = Image.new("RGBA", (W, Hh), (255, 255, 255, 255)); x = 0
        for i in ims: row.paste(i, (x, 0)); x += i.width + 10
        rows.append(row)
    H = sum(r.height for r in rows) + 10 * (len(rows) - 1); W = max(r.width for r in rows)
    sheet = Image.new("RGBA", (W, H), (255, 255, 255, 255)); y = 0
    for r in rows: sheet.paste(r, (0, y)); y += r.height + 10
    sheet.convert("RGB").save(out)
