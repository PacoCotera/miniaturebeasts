"""Pass 3 step 4: adaptive density and the feet. The toes as regular hard shells; vertex count per part; a 3x foot close-up in clay, Normal and coat; the atlas islands of the feet and the toes. Under the bpy venv."""
import os, sys, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20p3 as P3, s20p2 as P2, s20indiv as IN, s20normals as NM, nview, bpyio as B, sheetlib as SL, s20tex as TX, s20render as RN, s20pipe as PP

OUT = P3.OUT
SUB = os.path.join(OUT, "feet"); os.makedirs(SUB, exist_ok=True)
c, b, R = IN.make(1)
tex = PP.make_tex(b, c["coat"])
paths = P2.write_tex(tex, os.path.join(SUB, "tex"))
M = TX.render_mesh(b, 1)
W, H, PPH = 400, 300, 285.0
VIEWS = [("front", 15, 12, (0.12, 0.25, 0.1)), ("3/4", 50, 18, (0.12, 0.25, 0.1)), ("side", 90, 8, (0.1, 0.3, 0.1)), ("below", 20, -55, (0.12, 0.25, 0.05))]
V2, F2, at, fp2 = P2.level_arrays(b, 2)
vn = NM.vertex_normals(V2, F2)
Vl1, Fl1, atl1, fl1 = P2.level_arrays(b, 1)
vn1 = NM.vertex_normals(Vl1, Fl1)
for nm, az, el, cen in VIEWS:
    n = nm.replace("/", "-")
    P3.clay_side(b, R, os.path.join(SUB, f"clay-{n}.png"), az=float(az), el=float(el), centre=cen, w=W, h=H, pph=PPH, spine=False, samples=48)
    B.write_png(os.path.join(SUB, f"normal-{n}.png"), nview.render(Vl1, Fl1, vn1, az, el, cen, PPH, W, H)[0])
    p = os.path.join(SUB, f"coat-{n}.png")
    a, cam = RN.render_tex(M, paths, c["coat"], p, W, H, PPH, az=float(az), el=float(el), centre=cen, samples=64)
    RN.to_png(a, p)
# vertex count per part of the shipped (level-1) mesh, welded
part = M["part"]; names = {v: k for k, v in b.parts.items()}
cnt = {names[int(p)]: int((part == p).sum()) for p in np.unique(part)}
tot = len(M["Vw"])
rows = [(k, v, "") for k, v in cnt.items()] + [("total welded", tot, SL.status(tot <= 4000, "about 4,000 or less")), ("in the glb (split at UV seams)", len(M["V"]), "")]
# the toe/foot islands from the atlas

def crop(arr, x0, y0, w, h, name, scale=3):
    a = np.clip(arr[y0:y0 + h, x0:x0 + w], 0, 255).astype(np.uint8)
    a = np.kron(a, np.ones((scale, scale, 1), np.uint8))
    B.write_png(os.path.join(SUB, name), a)
crop(tex["col"], 1740, 980, 140, 70, "atlas-toe.png", 5)
crop(tex["col"], 40, 1310, 600, 330, "atlas-leg.png", 1)
crop(tex["col"], 1540, 780, 200, 130, "atlas-sole.png", 3)
def grid(prefix):
    return "<div class='grid' style='grid-template-columns:repeat(4,%dpx)'>" % W + "".join(f"<div class='cell'><img src='feet/{prefix}-{nm.replace('/', '-')}.png' width='{W}'><div class='cap'>{nm}</div></div>" for nm, _, _, _ in VIEWS) + "</div>"
body = ("<h1>S20 Tuliko pass 3, step 4: adaptive density and the feet</h1>"
        "<p>The toes are now three separate hard shells per foot (ellipsoids 0.14 x 0.11 x 0.10 H, 8 around, two rings and two apexes: 18 cage vertices each), sunk about 0.1 H into the foot, evenly spaced 30&deg; apart about the foot's axis (turned 10&deg; outward), symmetric, resting on the ground. "
        "The old extruded boxes folded at the front of the foot (min adjacent face dot -0.22); the shells do not (min dot above 0). The paw colour is a smooth function of height; the toe shells have their own small atlas island (a sphere map, 8 px or more of padding) so no foot colour reaches the beads. Vertex counts are of the shipped level-1 mesh.</p>"
        + SL.table(rows, ["Part", "Vertices", ""])
        + "<h2>Coat, 3x the house scale</h2>" + grid("coat") + "<h2>Clay</h2>" + grid("clay") + "<h2>Normal view (the shipped level-1 mesh)</h2>" + grid("normal")
        + "<h2>Atlas: toe island (x5), sole island (x3), leg island</h2><div class='row'><div class='cell'><img src='feet/atlas-toe.png'></div><div class='cell'><img src='feet/atlas-sole.png'></div><div class='cell'><img src='feet/atlas-leg.png'></div></div>")
open(os.path.join(OUT, "feet.html"), "w").write(SL.page("feet", body))
SL.shoot(os.path.join(OUT, "feet.html"), os.path.join(OUT, "feet.png"), 1700)
print(cnt, tot)
