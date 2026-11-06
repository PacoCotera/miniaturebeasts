"""Stop 5 sheet. Run with the cad venv python (PIL): draws the sample points on a crop."""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, "tools"))
from sheetlib import page, shot
from sheetgen import *
from PIL import Image, ImageDraw
S5, LOIKA = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]); cp = make_cp(LOIKA)
mast, sdf = refs(cp, os.path.dirname(S5))
m = json.load(open(os.path.join(S5, "measures.json")))
c = {s: cp(os.path.join(S5, f"loika-{s}.png"), f"s5-loika-{s}.png") for s in (304, 96, 48)}
face = cp(os.path.join(S5, "face3x.png"), "s5-face3x.png"); cream = cp(os.path.join(S5, "cream4x.png"), "s5-cream4x.png")
# sample points on a 3x crop of the 304 sprite
im = Image.open(os.path.join(S5, "loika-304.png")).convert("RGBA"); bg = Image.new("RGBA", im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
big = bg.crop((0, 40, 304, 300)).resize((912, 780), Image.NEAREST); d = ImageDraw.Draw(big)
cols = {"lit body": (255, 0, 0), "shade body": (0, 0, 255), "cream in shade": (0, 160, 0), "nose": (255, 0, 255), "muzzle lit": (255, 140, 0), "ring top": (0, 200, 200), "ring bottom": (120, 0, 200), "iris crescent": (255, 255, 0), "iris body": (0, 0, 0)}
for k, pts in m["points"].items():
    for x, y in pts:
        X, Y = x * 3, (y - 40) * 3; d.ellipse((X - 5, Y - 5, X + 5, Y + 5), outline=cols[k], width=3)
big.convert("RGB").save(os.path.join(LOIKA, "img", "s5-sample-points.png"))
L = m["light"]
def row(name, val, rule, ok): return f"<tr><td>{name}</td><td>{val}</td><td>{rule}</td><td class='{'ok' if ok else 'warn'}'>{'in band' if ok else 'outside'}</td></tr>"
rows = [row("lit body vs shade body (shade / lit, linear)", f"{L['shade_over_lit']:.2f}", "0.55-0.70", 0.55 <= L['shade_over_lit'] <= 0.70),
        row("cream in shade, L*", f"{L['cream_shade_L']:.1f}", ">= 70 (master about 73)", L['cream_shade_L'] >= 70),
        row("nose minus muzzle's lit side, L*", f"{L['nose_minus_muzzle']:+.1f}", ">= -5 (master +9.2)", L['nose_minus_muzzle'] >= -5),
        row("ring top minus ring bottom, L*", f"{L['ring_top_minus_bottom']:+.1f}", ">= -8 (master -6.8)", L['ring_top_minus_bottom'] >= -8),
        row("iris crescent, L*", f"{L['iris_crescent_L']:.1f}", "62-70", 62 <= L['iris_crescent_L'] <= 70),
        row("iris body, L*", "not sampled" if L['iris_body_L'] != L['iris_body_L'] else f"{L['iris_body_L']:.1f}", "13-33", L['iris_body_L'] == L['iris_body_L'] and 13 <= L['iris_body_L'] <= 33)]
legend = " ".join(f"<span style='color:rgb{v}'>&#9679;</span> {k}" for k, v in cols.items())
body = ("<h1>Stop 5: the face and the paint, in the house's light (pinned commit 3f8dfb8fd)</h1><div class='sub'>Eye discs conform to the head and are textured from the house's eye formula; smile ink and cream are computed on the rest-pose level-4 surface and ride the rig; beans cream; leaves from the crown socket; floor shadow tinted (30, 26, 34). Join A.</div>"
        "<h2>304 x 312</h2><div class='row'>" + cell(mast[304], "master") + cell(sdf[304], "SDF, pinned commit") + cell(c[304], "mesh") + "</div>"
        "<h2>96 x 88 (3x) and 48 x 48 (4x)</h2><div class='row'>" + cell(mast[96], "master 96", 3) + cell(sdf[96], "SDF 96", 3) + cell(c[96], "mesh 96", 3) + "</div><div class='row' style='margin-top:10px'>" + cell(mast[48], "master 48", 4) + cell(sdf[48], "SDF 48", 4) + cell(c[48], "mesh 48", 4) + "</div>"
        "<h2>The face at 3x and the cream's edge at 4x (stand pose)</h2><div class='row'>" + cell(face, "face, 3x") + cell(cream, "chin, throat and chest, 4x") + "</div>"
        f"<h2>Sample points for the five light measures (304 crop, shown 3x)</h2><div class='row'>{cell('img/s5-sample-points.png', legend)}<div class='cell'><table><tr><th>Measure</th><th>Mesh</th><th>House</th><th></th></tr>{''.join(rows)}</table></div></div>")
html = os.path.join(LOIKA, "5-loika-colour.html"); page("Stop 5", body, html); shot(html, os.path.join(LOIKA, "5-loika-colour.png"), 1540)
