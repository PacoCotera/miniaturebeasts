"""Stop 0 picture: the house's field as contour lines (the zero level of the SDF masses), with the house numbers. Run with the bpy venv python."""
import os, sys, json, subprocess
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "tools"))
from housefield import House
from sheetlib import contour_segments, svg_segments, page, shot

OUT = sys.argv[1]
H = House("S01")
kc, S, g = H.kc, H.S, H.g
os.makedirs(OUT, exist_ok=True)

def sec(fn, plane, c, n=260, box=None):
    """A section of field fn (world points) in the plane 'xz' at y = c, or 'yz' at x = c."""
    x0, x1, z0, z1 = box
    if plane == "xz":
        f = lambda X, Z: fn(np.stack([X, np.full_like(X, c), Z], -1))
    else:
        f = lambda X, Z: fn(np.stack([np.full_like(X, c), X, Z], -1))
    return contour_segments(f, x0, x1, z0, z1, n)

head = lambda p: H.d0(p - kc)
def panel(title, w, hgt, box, layers, marks=(), labels=()):
    x0, x1, z0, z1 = box
    sx = (w - 40) / (x1 - x0); sz = sx
    ox, oz = 20 - x0 * sx, hgt - 24 + z0 * sz
    s = f"<svg width='{w}' height='{hgt}' style='background:#fff;border:1px solid #bbb;font-family:DejaVu Sans;font-size:14px'>"
    s += f"<line x1='0' y1='{oz:.1f}' x2='{w}' y2='{oz:.1f}' stroke='#bbb' stroke-dasharray='4 4'/><text x='6' y='{oz-4:.1f}' fill='#777'>floor z = 0</text>"
    for segs, col, wd in layers:
        s += svg_segments(segs, sx, sz, ox, oz, col, wd)
    for (x, z, txt, col) in marks:
        s += f"<circle cx='{ox + x*sx:.1f}' cy='{oz - z*sz:.1f}' r='4' fill='{col}'/>"
        if txt:
            s += f"<text x='{ox + x*sx + 7:.1f}' y='{oz - z*sz + 5:.1f}' fill='{col}'>{txt}</text>"
    s += f"<text x='8' y='20' font-weight='bold'>{title}</text></svg>"
    return s

# 1. side section y = 0: head (blue), torso (green); the leg section at the fore leg's y (orange) and the paws
lg = H.legs[0]
side_box = (-2.55, 1.15, -0.05, 2.1)
L = []
L.append((sec(head, "xz", 0, 300, side_box), "#1f5fbf", 1.8))
L.append((sec(H.dTorso, "xz", 0, 300, side_box), "#1a8a3a", 1.8))
for l in H.legs[:1] + H.legs[2:3]:
    L.append((sec(l["d"], "xz", l["y"], 300, side_box), "#d07010", 1.5))
    L.append((sec(l["d_paw"], "xz", l["y"], 200, side_box), "#a02080", 1.5))
marks = [(kc[0], kc[2], "K centre", "#1f5fbf"), (H.eyes[0]["c"][0] + kc[0], H.eyes[0]["c"][2] + kc[2], "eye", "#c02020"),
         (H.nose["surf"][0] + kc[0], H.nose["surf"][2] + kc[2], "nose", "#a02080"), (H.chest["c"][0], H.chest["c"][2], "C", "#1a8a3a"), (H.pelvis["c"][0], H.pelvis["c"][2], "P", "#1a8a3a")]
p1 = panel("Side: head (blue), torso (green), legs (orange), paws (purple)", 1000, 720, side_box, L, marks)
# 2. head, enlarged: side section and front section
hb = (-0.75, 1.0, 0.8, 2.05)
Lh = [(sec(head, "xz", 0, 300, (kc[0] + hb[0], kc[0] + hb[1], hb[2] - 0.0, hb[3])), "#1f5fbf", 1.8)]
bh = (kc[0] - 0.8, kc[0] + 1.0, kc[2] - 0.65, kc[2] + 0.62)
Lh = [(sec(head, "xz", 0, 300, bh), "#1f5fbf", 1.8), (sec(lambda p: H.dK(p - kc), "xz", 0, 300, bh), "#9ab", 1.0), (sec(lambda p: H.dM(p - kc), "xz", 0, 200, bh), "#d08090", 1.0)]
e0 = H.eyes[0]
marksh = [(kc[0] + e0["c"][0], kc[2] + e0["c"][2], "eye line z=%+.3f" % g["zEye"], "#c02020"), (kc[0] + H.nose["surf"][0], kc[2] + g["noseCz"], "nose z=%+.3f" % g["noseCz"], "#a02080"),
          (kc[0], kc[2] + g["mouthZ"], "", "#222")]
mx = float(__import__("housefield").find_front(H.d0, 0, g["mouthZ"]))
marksh[2] = (kc[0] + mx, kc[2] + g["mouthZ"], "mouth z=%+.3f" % g["mouthZ"], "#222")
cz = np.array([[0, 0, 0.5]])
top = float(__import__("cage").bisect_ray(H.d0, np.array([[-0.07, 0, 0.0]]), np.array([[0, 0, 1.0]]), 0, 1)[0, 2])
marksh.append((kc[0] - 0.075, kc[2] + top, "crown (highest, set back)", "#1a8a3a"))
p2 = panel("Head side: K union M (blue), K (grey), M (pink)", 720, 640, bh, Lh, marksh)
fb = (-0.95, 0.95, kc[2] - 0.62, kc[2] + 0.62)
def fsec(fn, c=0.0): return contour_segments(lambda Y, Z: fn(np.stack([np.full_like(Y, c), Y, Z], -1)), fb[0], fb[1], fb[2], fb[3], 300)
Lf = [(fsec(lambda p: H.dK(p - kc), c=kc[0] + 0.3), "#1f5fbf", 1.8), (fsec(lambda p: H.dK(p - kc), c=kc[0] + 0.0), "#9ab", 1.0)]
Lf += [(contour_segments(lambda Y, Z: H.dM(np.stack([np.full_like(Y, 0.55 + kc[0] * 0), Y, Z], -1) - kc + 0), fb[0], fb[1], fb[2], fb[3], 200), "#d08090", 1.0)]
fm = [(H.eyes[0]["c"][1], kc[2] + g["zEye"], "eye", "#c02020"), (-H.eyes[0]["c"][1], kc[2] + g["zEye"], "", "#c02020")]
p3 = panel("Head front: x = centre+0.3 (blue), centre (grey)", 480, 640, fb, Lf, fm)
rows = [("form.head H/S", H.fp["hs"], f"S = {S:.3f} H"), ("form.head-width W/H", H.fp["WoverH"], ""), ("form.head-depth D/H", H.fp["DoverH"], ""), ("form.eye-size E/Wf", H.fp["eW"], f"E = {g['E']:.3f} H"),
        ("form.eye-height eye-drop/H", H.fp["eyeDrop"], f"eye centre z = {g['zEye']:+.3f}"), ("form.eye-spacing", H.fp["spacing"], f"centres y = ±{g['yE']:.3f}"), ("form.eye-ring", H.fp["ring"], f"R_eye = {g['Reye']:.3f}"),
        ("form.muzzle projection", H.fp["projection"], f"M centre x = {H.M['c'][0]:+.3f}, r = ({H.M['r'][0]:.3f}, {H.M['r'][1]:.3f}, {H.M['r'][2]:.3f})"), ("form.nose nose-w/W", H.fp["noseW"], f"nose width {H.nose['r'][1]*2:.3f} H = {H.nose['r'][1]*2/g['E']:.2f} E"),
        ("form.nose-drop", H.fp["noseDrop"], f"nose centre z = {g['noseCz']:+.3f}"), ("mouth z", g["mouthZ"], f"mouth width {H.mouth['w']:.3f} H"), ("form.carriage (chin up, deg)", H.fp["carriage"], "a pose, not geometry"),
        ("crown-set-back / top-taper / chin-taper", "0.15 / 0.20 / 0.22", "kinds.head.bean, exponent 2.2")]
tbl = "<table><tr><th>House name</th><th>Value (S01)</th><th>In H</th></tr>" + "".join(f"<tr><td>{a}</td><td>{b if isinstance(b,str) else round(b,4)}</td><td>{c}</td></tr>" for a, b, c in rows) + "</table>"
body = (f"<h1>Stop 0: the house in Python — the field, as contour lines</h1><div class='sub'>Loika S01, pinned commit 3f8dfb8fd of build/genome-foundation. H = head height = 1; S = {S:.3f}; chest centre ({H.chest['c'][0]:+.3f}, {H.chest['c'][2]:.3f}), "
        f"pelvis centre ({H.pelvis['c'][0]:+.3f}, {H.pelvis['c'][2]:.3f}), body shift sx = {H.sx:+.3f}. Zero level of the SDF masses; the Python port equals the SDF to 1e-9 on 400 sample points (tests/test_housefield.py).</div>"
        f"<div class='row'><div class='cell'>{p1}</div></div><div class='row' style='margin-top:14px'><div class='cell'>{p2}</div><div class='cell'>{p3}</div><div class='cell'>{tbl}</div></div>")
html = os.path.join(OUT, "0-field.html")
page("Stop 0: field", body, html)
shot(html, os.path.join(OUT, "0-field.png"), 1560)
print("ok")
