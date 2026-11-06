"""Round 3 sheets (cadvenv python, PIL + Playwright): 9-round3 (master, SDF fix7, mesh round 2 and round 3 at 304, 96 and 48; the numbers; the light; the faults one by one) and 10-head (the head front,
side and three-quarter; the glb's face).   python sheet9.py WORKDIR LOIKA_DIR SDFDIR
WORKDIR holds s5/ s6/ hv/ measures-all.json checks.json.  Sheets are HTML with real text (DejaVu Sans, 14 px and up) beside their PNG."""
import os, sys, json, shutil
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, "tools"))
from sheetlib import page, shot
from PIL import Image, ImageDraw
import numpy as np
W, LOIKA, SDF = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]), os.path.abspath(sys.argv[3])
R3 = os.path.join(LOIKA, "round3"); IMG = os.path.join(R3, "img"); os.makedirs(IMG, exist_ok=True)
R1, R2 = os.path.join(LOIKA, "img"), os.path.join(LOIKA, "round2", "img")
GROUND, GLASS = (0xD6, 0xCE, 0xBE, 255), (0x20, 0x26, 0x2C, 255)
Z = {304: 1, 96: 3, 48: 5}
def comp(path, bg):
    im = Image.open(path).convert("RGBA"); base = Image.new("RGBA", im.size, bg); base.alpha_composite(im); return base
def r2img(s, tag):
    im = Image.open(f"{R2}/cmp-r2-{s}-{tag}.png").convert("RGBA"); z = Z[s]
    return im if z == 1 else im.resize((im.width // z, im.height // z), Image.NEAREST)
def get(k, s, tag):
    bg = GROUND if tag == "g" else GLASS
    return {"master": lambda: comp(f"{R1}/master-{s}.png", bg), "sdf": lambda: comp(f"{SDF}/sdf-S01-{s}.png", bg), "r2": lambda: r2img(s, tag), "r3": lambda: comp(f"{W}/s5/loika-{s}.png", bg)}[k]()
def zoom(im, z, box=None):
    if box: im = im.crop(box)
    return im.resize((im.width * z, im.height * z), Image.NEAREST if z > 1 else Image.LANCZOS)
def save(im, name):
    im.convert("RGB").save(os.path.join(IMG, name)); return "img/" + name
def cell(src_, cap): return f"<div class='cell'><img src='{src_}'><div class='cap'>{cap}</div></div>"
for s in (304, 96, 48):          # the SDF's tiles at fc80e5312 next to the sheets
    shutil.copy(f"{SDF}/sdf-S01-{s}.png", os.path.join(IMG, f"sdf-fix7-{s}.png"))
    shutil.copy(f"{W}/s5/loika-{s}.png", os.path.join(IMG, f"loika-r3-{s}.png"))
KEYS = [("master", "Master"), ("sdf", "SDF fix 7 (fc80e5312)"), ("r2", "Mesh round 2"), ("r3", "Mesh round 3")]
def lineup(tag, sizes):
    rows = []
    for s in sizes:
        cells = "".join(cell(save(zoom(get(k, s, tag), Z[s]), f"cmp-{k}-{s}-{tag}.png"), f"{lb}, {s}" + (f" (shown {Z[s]}x)" if Z[s] > 1 else "")) for k, lb in KEYS)
        rows.append(f"<div class='row' style='margin-bottom:10px'>{cells}</div>")
    return "".join(rows)
M = json.load(open(os.path.join(W, "measures-all.json"))); S5 = json.load(open(os.path.join(W, "s5", "measures.json"))); L = S5["light"]; CK = json.load(open(os.path.join(W, "checks.json")))
R2L = json.load(open(os.path.join(LOIKA, "round2", "report.json")))["light_measures"]
def band(v, lo, hi): return "ok" if lo <= v <= hi else "warn"
rows = [("Shade over lit, flank of the body (linear)", f"{L['shade_over_lit']:.2f}", f"{R2L['shade_over_lit']:.2f}", "0.55 to 0.70", band(L['shade_over_lit'], .55, .70)),
        ("Cream in shade, L*", f"{L['cream_shade_L']:.1f}", f"{R2L['cream_shade_L']:.1f}", "at least 70", band(L['cream_shade_L'], 70, 100)),
        ("Nose minus lit muzzle, L*", f"{L['nose_minus_muzzle']:+.1f}", f"{R2L['nose_minus_muzzle']:+.1f}", "at least -5 (master +9.2)", band(L['nose_minus_muzzle'], -5, 99)),
        ("Ring top minus bottom, L*", f"{L['ring_top_minus_bottom']:+.1f}", f"{R2L['ring_top_minus_bottom']:+.1f}", "at least -14 (fix 7 lid shade; was -8)", band(L['ring_top_minus_bottom'], -14, 99)),
        ("Iris crescent, L*", f"{L['iris_crescent_L']:.1f}", f"{R2L['iris_crescent_L']:.1f}", "62 to 70", band(L['iris_crescent_L'], 62, 70)),
        ("Iris body, L*", f"{L['iris_body_L']:.1f}", f"{R2L['iris_body_L']:.1f}", "13 to 33", band(L['iris_body_L'], 13, 33))]
lt = "".join(f"<tr><td>{a}</td><td class='{o}'>{b}</td><td>{c}</td><td>{d}</td><td class='{o}'>{'in band' if o == 'ok' else 'outside'}</td></tr>" for a, b, c, d, o in rows)
cols = [("master", "Master"), ("sdf", "SDF fix 7"), ("r2", "Round 2"), ("r3", "Round 3")]
mrows = [("Cream L* (AD mask, median)", lambda d: f"{d['cream_L']:.1f}", "80 to 88"), ("Cream b*", lambda d: f"{d['cream_b']:.1f}", "about 21"),
         ("Body L* p10 / p50 / p90", lambda d: " / ".join(f"{x:.1f}" for x in d['body_L_p10_50_90']), "master 13.8 / 21.9 / 35.3"), ("Body b* (median)", lambda d: f"{d['body_b']:+.1f}", "about 0"),
         ("Head's forward-most point, y", lambda d: f"{d['head_front_y']:.0f}", "155 to 165 (the lower face: fix 8)"), ("Head top at x 180, y", lambda d: f"{d['head_top_y_at_x180']}", "master 107"),
         ("Far / near eye ring width", lambda d: f"{d['eye_ring_ratio']:.2f}", "0.45 to 0.65"), ("Eye line, far side up (deg)", lambda d: f"{d['eye_line_deg_far_up']:+.1f}", "master +9.5"),
         ("Partly transparent px far from the creature", lambda d: f"{d['partial_far_from_creature_px']}", "master 1134 (its own shadow)")]
mt = "<tr><th>Measure (304 sprite)</th>" + "".join(f"<th>{n}</th>" for _, n in cols) + "<th>Target</th></tr>" + "".join(f"<tr><td>{n}</td>" + "".join(f"<td>{f(M[k])}</td>" for k, _ in cols) + f"<td>{t}</td></tr>" for n, f, t in mrows)
lf = M["leaf"]
leaf_t = "<tr><th>Leaf pixels (304 sprite)</th><th>L* p10 / p50 / p90</th><th>a*</th><th>b*</th></tr>" + "".join(f"<tr><td>{n}</td><td>{' / '.join(str(x) for x in lf[k]['L_p10_50_90'])}</td><td>{lf[k]['a']}</td><td>{lf[k]['b']}</td></tr>" for k, n in (("master", "Master"), ("sdf", "SDF fix 7"), ("r3", "Mesh round 3")))
leg_t = "<tr><th>Leg, surface against the house's field</th><th>mean, H</th><th>share deeper than 0.04 H</th><th>deepest, H</th></tr>" + "".join(f"<tr><td>{k}</td><td>{v['mean_signed_H']:+.4f}</td><td>{v['share_deeper_than_0_04']*100:.1f} %</td><td>{v['min_H']:+.3f}</td></tr>" for k, v in CK["leg_field"].items())
# sample points on the 304 sprite
im = comp(f"{W}/s5/loika-304.png", (255, 255, 255, 255)); big = im.crop((0, 40, 304, 300)).resize((912, 780), Image.NEAREST); d = ImageDraw.Draw(big)
pc = {"lit body": (255, 0, 0), "shade body": (0, 0, 255), "cream in shade": (0, 160, 0), "nose": (255, 0, 255), "muzzle lit": (255, 140, 0), "ring top": (0, 200, 200), "ring bottom": (120, 0, 200), "iris crescent": (255, 255, 0), "iris body": (0, 0, 0)}
for k, pts in S5["points"].items():
    for x, y in pts:
        X, Y = x * 3, (y - 40) * 3; d.ellipse((X - 5, Y - 5, X + 5, Y + 5), outline=pc[k], width=3)
sp = save(big, "sample-points.png")
legend = " ".join(f"<span style='color:rgb{v}'>&#9679;</span> {k}" for k, v in pc.items())
# the face: round 2 (3x on ground), round 3 (3x render), the master and the SDF cropped at 3x of 304
fbox = (0, 105, 175, 225)
fr = lambda k: save(zoom(get(k, 304, "g"), 3, fbox), f"face304-{k}.png")
f_r2 = save(Image.open(f"{R2}/face-r2.png"), "face-r2.png"); f_r3 = save(comp(f"{W}/s5/face3x.png", GROUND), "face-r3.png")
# the lower face at 96, 6x
l96 = lambda k: save(zoom(get(k, 96, "g"), 6, (2, 28, 54, 66)), f"face96-{k}.png")
paws = lambda k: save(zoom(get(k, 304, "g"), 2, (70, 200, 290, 312)), f"legs304-{k}.png")
body = f"""<h1>Loika in the mesh pipeline, round 3: the frozen dome head</h1>
<div class='sub'>Master, SDF fix 7 (fc80e5312, the house the mesh now takes), mesh round 2 and mesh round 3, on the house ground #D6CEBE. Pictures are shown 1x at 304, 3x at 96 and 5x at 48. The head's skull, eyes and light are the
house's frozen dome; the jaw, chin, muzzle, cream, smile and leaves are fc80e5312's placeholders, read from the house file by name so fix round 8's numbers drop in as data.</div>
<h2>304 x 312, 96 and 48 beside the master, on the house ground</h2>{lineup('g', (304, 96, 48))}
<h2>96 and 48 on dark glass (haze would show here)</h2>{lineup('dk', (96, 48))}
<h2>The numbers (the AD gate's masks, 304 sprite)</h2><table>{mt}</table>
<h2>The light measures, in the house's light</h2>
<div class='row'><div class='cell'>{cell(sp, legend)}</div><div class='cell'><table><tr><th>Measure</th><th>Round 3</th><th>Round 2</th><th>House</th><th></th></tr>{lt}</table><div class='cap'>Sampled on the flank of the body (leg weight under 0.05, right of the head) and on points the camera sees. Key scale 1.8, fill ratio parameter 0.50 (round 2: 1.45 and 0.60): the round head's body has more of its flank in the light, and the cream needs the key.</div></div></div>
<h2>Item 1, 2 and 3: the head, the rim and the snout, the cheek slab and the smile wings (face at 3x)</h2>
<div class='row'>{cell(fr('master'), 'Master')}{cell(fr('sdf'), 'SDF fix 7')}{cell(f_r2, 'Mesh round 2: tilted lens, hard rim, snout block, cream slab, ink wings')}{cell(f_r3, 'Mesh round 3 (3x render)')}</div>
<h2>The lower face at 96 (6x): master, SDF fix 7, round 2, round 3</h2>
<div class='row'>{cell(l96('master'), 'Master')}{cell(l96('sdf'), 'SDF fix 7')}{cell(l96('r2'), 'Round 2')}{cell(l96('r3'), 'Round 3')}</div>
<h2>Item 4, 5 and 6: legs, leaves, nose</h2>
<div class='row'><div class='cell'><table>{leg_t}</table><div class='cap'>Round 2 measured the same way: mean -0.006 H on every leg, as far in as -0.08 H. The deep sags that remain are the hidden underside and the bridge to the torso.</div></div>
<div class='cell'><table>{leaf_t}</table><div class='cap'>Olive at the master's value: the albedo is the house's leaf colour (104, 122, 46), taken down by 0.68 for the mesh's key. The master's p90 is its glossy rib lights, which the mesh does not draw.</div></div></div>
<div class='row' style='margin-top:10px'>{cell(paws('master'), 'Legs and paws, master')}{cell(paws('sdf'), 'SDF fix 7')}{cell(paws('r3'), 'Mesh round 3')}</div>"""
page("Loika round 3", body, os.path.join(R3, "9-round3.html")); shot(os.path.join(R3, "9-round3.html"), os.path.join(R3, "9-round3.png"), 1500)
# ---- the head sheet
hv = lambda n: save(comp(f"{W}/hv/{n}.png", GROUND), f"{n}.png")
hbox = (0, 10, 240, 215)
mh = save(zoom(get("master", 304, "g"), 2, hbox), "head-master.png"); sh = save(zoom(get("sdf", 304, "g"), 2, hbox), "head-sdf.png")
tj = lambda n: save(Image.open(f"{W}/s6/{n}.png").convert("RGB").resize((480, 480), Image.LANCZOS), f"{n}.png")
c = CK["head_dome"]
body = f"""<h1>Loika round 3, the head: three-quarter, front and side</h1>
<div class='sub'>The frozen dome on the mesh: width {c['W']:.2f} H, depth {c['D']:.2f} H, section exponent {c['K']['n']} in front and {c['rear_exponent']} behind, eye centres {c['eye_centres_apart_H']:.2f} H apart, roll sign {c['roll_sign']}. There is no front or side master:
the front and the side are the build's alone, with the head square to the body (no yaw, roll or chin-up). Gaze is the stand view's in all three. Shown 1x.</div>
<h2>Three-quarter: master, SDF fix 7, mesh round 3</h2><div class='row'>{cell(mh, 'Master (304 crop, 2x)')}{cell(sh, 'SDF fix 7 (304 crop, 2x)')}{cell(hv('head-3q'), 'Mesh round 3, the stand pose')}</div>
<h2>Front and side, mesh round 3</h2><div class='row'>{cell(hv('head-front'), f"Front: the head is {1 / c['W']:.2f} as tall as it is wide (1 H over {c['W']:.2f} H)")}{cell(hv('head-side'), 'Side')}</div>
<h2>The glb in three.js (rendered at 2x, shown at 1x), level 3 geometry</h2><div class='row'>{cell(tj('tjs-rest'), 'Rest')}{cell(tj('tjs-face-rest'), 'Face, rest')}{cell(tj('tjs-face-blink'), 'Face, blink peak')}</div>"""
page("Loika round 3, the head", body, os.path.join(R3, "10-head.html")); shot(os.path.join(R3, "10-head.html"), os.path.join(R3, "10-head.png"), 1640)
print("sheets ok")
