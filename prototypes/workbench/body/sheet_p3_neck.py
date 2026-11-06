"""Pass 3 step 2: the neck. Head, neck and torso as one skin: clay, Normal view and the coat at az 0, 45, 90, 180 and 15 degrees from below, with the numbers (head width, head / body, neck band over head radius). Under the bpy venv."""
import os, sys, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20p3 as P3, s20p2 as P2, s20indiv as IN, s20normals as NM, nview, bpyio as B, sheetlib as SL, s20tex as TX, s20render as RN

OUT = P3.OUT
SUB = os.path.join(OUT, "neck"); os.makedirs(SUB, exist_ok=True)
c, b, R = IN.make(1)
VIEWS = [("az000", 0, 5), ("az045", 45, 10), ("az090", 90, 0), ("az180", 180, 5), ("below15", 0, -15), ("below15-45", 45, -15)]
CEN = (-0.2, 0, 1.45); W, H, PPH = 330, 400, 135.0
V, F, at, fp2 = P2.level_arrays(b, 2)
vn = NM.vertex_normals(V, F)
for nm, az, el in VIEWS:
    P3.clay_side(b, R, os.path.join(SUB, f"clay-{nm}.png"), az=float(az), el=float(el), centre=CEN, w=W, h=H, pph=PPH, spine=False)
    img = nview.render(V, F, vn, az, el, CEN, PPH, W, H)[0]
    B.write_png(os.path.join(SUB, f"normal-{nm}.png"), img)
out, tex, paths = P3.plush_views(b, R, c, SUB, sizes=(304, 96), extra=[(f"coat-{nm}", az, el, W, H, PPH, CEN) for nm, az, el in VIEWS], samples=64)
n = P3.head_numbers(b)
rows = [("head width (torso mesh, max)", f"{n['head_w']:.3f} H", 1.24 <= n['head_w'] <= 1.32, "about 1.28"),
        ("head / body width", f"{n['ratio']:.3f}", 1.05 <= n['ratio'] <= 1.15, "1.05-1.15"),
        ("neck band min width / head width", f"{n['neck_over_head']:.3f} (neck at z {n['neck_z']:.2f})", 0.62 <= n['neck_over_head'] <= 0.70, "0.62-0.70"),
        ("head depth", f"{n['head_depth']:.3f} H", None, "")]
tab = SL.table([(a, v, "" if ok is None else SL.status(ok), t) for a, v, ok, t in rows], ["Measure", "Value", "", "Needs"])
def grid(prefix):
    return "<div class='grid' style='grid-template-columns:repeat(6,%dpx)'>" % W + "".join(f"<div class='cell'><img src='neck/{prefix}-{nm}.png' width='{W}'><div class='cap'>{nm}</div></div>" for nm, _, _ in VIEWS) + "</div>"
body = ("<h1>S20 Tuliko pass 3, step 2: head, neck and torso in one skin</h1><p>The head is a round ball with an under-curve at the jaw and cheeks, a short concave neck band, then the shoulders and chest swell out again. "
        "Head width had grown to 1.41 H in pass 2: the junction smoothing (a Taubin pass over 8-9 cage edges from each arm socket) fattened the head by 10 %; it now reaches 0.3 H and never into the head, so the head is back to the design width. "
        "The arms moved down one ring (the arm socket sat at the neck).</p>" + tab
        + "<h2>The coat</h2>" + "<div class='row'><div class='cell'><div class='cap'>house 304</div><img src='neck/house-304.png' width='304'></div><div class='cell'><div class='cap'>96 (x3)</div><img src='neck/house-96.png' width='288' style='image-rendering:pixelated'></div></div>"
        + grid("coat") + "<h2>Clay</h2>" + grid("clay") + "<h2>Normal view</h2>" + grid("normal"))
open(os.path.join(OUT, "neck.html"), "w").write(SL.page("neck", body))
SL.shoot(os.path.join(OUT, "neck.html"), os.path.join(OUT, "neck.png"), 2040)
print(n)
