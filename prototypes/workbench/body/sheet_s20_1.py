"""S20 chunk 1 picture: 1-loft. 10-angle clay and wire of the gourd loft, the side profile of the limit surface against the file's own stations, the mesh-quality rows. Run (bpy venv): python sheet_s20_1.py [OUTDIR]"""
import sys, os, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20build, sheetgen as SG, sheetlib as SL, s20sheet as SS, s20views as SV, mquality as Q, subdiv as SD, s20measure as M
from gourd import Gourd

OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else SS.BUILD
os.makedirs(OUT, exist_ok=True)
b = s20build.make_s20(upto="loft")
spec = b.ctx["spec"]
G = Gourd(spec)
names = SV.turnaround(b, os.path.join(OUT, "c1"), centre=(0.0, 0, 1.2), width=480, height=520, pph=125.0, pole_dots=True)
Vf, Ff, at, fpp, cr, mir = b.full()
V2, F2, _, _, _ = SD.subdivide(Vf, Ff, cr, at, fpp, levels=2)
zs, w = M.widths(V2)
head, body, waist = w[zs > 1.17].max(), w[zs < 1.17].max(), w[(zs > 0.9) & (zs < 1.45)].min()


def profile_svg(W=520, H=640):
    pr = SS.Proj(250.0, W / 2, H - 40)
    z = np.linspace(G.ends[0], G.ends[1], 200)
    f = [(float(G.rho(zz, 1.0)), zz) for zz in z]; bk = [(-float(G.rho(zz, 0.0)), zz) for zz in z]
    s = [f"<svg xmlns='http://www.w3.org/2000/svg' width='{W}' height='{H}'><rect width='{W}' height='{H}' fill='#fffdf8'/>"]
    s.append(SS.poly(f + bk[::-1], pr, True, stroke="#b4552a", w=2, fill="none", dash="6 4"))
    m = np.abs(V2[:, 1]) < 1e-9
    for p in V2[m]:
        x, y = pr(p[0], p[2]); s.append(f"<circle cx='{x:.1f}' cy='{y:.1f}' r='1.6' fill='#1f4e9e'/>")
    for zz in spec["parts"]["torso"]["rings_z"]:
        x0, y0 = pr(-float(G.rho(zz, 0.0)) - 0.05, zz); x1, y1 = pr(float(G.rho(zz, 1.0)) + 0.05, zz)
        s.append(f"<line x1='{x0:.1f}' y1='{y0:.1f}' x2='{x1:.1f}' y2='{y1:.1f}' stroke='#cfc8b6'/>")
    s.append(SS.svg_text(10, 22, "Side profile on the mirror line", 16, weight="bold"))
    s.append(SS.svg_text(10, 44, "blue dots: level-2 limit surface; orange dashed: the file's section", 14))
    s.append(SS.svg_text(10, 64, "grey lines: the 16 cage rings", 14))
    s.append("</svg>")
    return "".join(s)


def width_svg(W=520, H=640):
    pr = SS.Proj(250.0, 40, H - 40)
    s = [f"<svg xmlns='http://www.w3.org/2000/svg' width='{W}' height='{H}'><rect width='{W}' height='{H}' fill='#fffdf8'/>"]
    pts = [(ww * 0.5 + 0.0, zz) for zz, ww in zip(zs, w)]
    s.append(SS.poly([(a * 2, c) for a, c in pts], pr, stroke="#1f4e9e", w=2))
    for lab, val, z in (("head", head, 1.7), ("waist", waist, 1.16), ("body", body, 0.72)):
        x, y = pr(val, z)
        s.append(f"<circle cx='{x:.1f}' cy='{y:.1f}' r='4' fill='#b4552a'/>")
        s.append(SS.svg_text(x + 8, y + 5, f"{lab} {val:.3f} H", 15))
    s.append(SS.svg_text(10, 22, "Width (full) by height", 16, weight="bold"))
    s.append("</svg>")
    return "".join(s)


extra = [("head wider than body: head / body widths (file 1.28 / 1.18)", f"{head:.3f} / {body:.3f}", head > body),
         ("waist >= 0.85 H wide (file 0.90)", f"{waist:.3f} H", waist >= 0.85)]
import test_helpers_s20 as TH
rr = TH.ring_ratio(b)
cc = TH.crown_curv(b, V2)
extra += [("adjacent ring half-width and depth ratio <= 1.5", f"{rr:.3f}", rr <= 1.5),
          ("crown cap curvature within 25 % of the band below (no plateau)", f"cap {cc[0]:.2f}, band {cc[1]:.2f}, ratio {cc[0] / cc[1]:.2f}", abs(cc[0] / cc[1] - 1) <= 0.25)]
rows = SG.quality_rows(b, extra)
body_html = ("<h1>S20 Tuliko, chunk 1: the gourd loft</h1>"
             "<p>One loft on a straight vertical spine, head and body as two lobes joined by a soft waist: 16 rings of 9 half columns, grid caps cast on the section's own profile at the seat and the crown. "
             "Level 2, clay in the house light, orthographic. The leg, tail and ear sockets are not cut yet. Column keys put a column through each socket centre.</p>"
             f"<div class='row'><div class='cell'>{profile_svg()}</div><div class='cell'>{width_svg()}</div></div>"
             "<h2>Clay, 10 views</h2>" + SS.SL_grid("clay", "c1", names) if hasattr(SS, "SL_grid") else "")
SL_grid = lambda prefix, sub, names, w=480, cols=4: f"<div class='grid' style='grid-template-columns:repeat({cols},{w}px)'>" + "".join(f"<div class='cell'><img src='{sub}/{prefix}-{n}.png' width='{w}'><div class='cap'>{n}</div></div>" for n in names) + "</div>"
body_html = ("<h1>S20 Tuliko, chunk 1: the gourd loft</h1>"
             "<p>One loft on a straight vertical spine, head and body as two lobes joined by a soft waist: 16 rings of 9 half columns, grid caps cast on the section's own profile at the seat and the crown. "
             "Level 2, clay in the house light, orthographic. The leg, tail and ear sockets are not cut yet; column keys put a column through each socket centre.</p>"
             f"<div class='row'><div class='cell'>{profile_svg()}</div><div class='cell'>{width_svg()}</div></div>"
             "<h2>Clay, 10 views</h2>" + SL_grid("clay", "c1", names) +
             "<h2>Wireframe (valence 3 green: the four cap corners per half; nothing else is off 4)</h2>" + SL_grid("wire", "c1", names) +
             "<h2>Mesh quality (the file's thresholds; failing rows stay failing)</h2>" + SG.rows_html(rows))
p = os.path.join(OUT, "1-loft.html")
open(p, "w").write(SL.page("S20 chunk 1 loft", body_html))
SL.shoot(p, os.path.join(OUT, "1-loft.png"), 1960)
print("ok")
