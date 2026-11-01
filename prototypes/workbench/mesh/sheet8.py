"""Round 2 sheets (cadvenv python, PIL + Playwright): 8-round2 (master, SDF, round 1 and round 2 at 304, 96 and 48; the faults one by one) and 7-skin (the velvet beside the flat build).
python sheet8.py WORKDIR LOIKA_DIR     WORKDIR holds s5/ velvet/ s6/ s4/ blink/ (stop5, stop5 velvet, stop6, stop4, blink.py outputs)"""
import os, sys, json, shutil, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, "tools"))
from sheetlib import page, shot
from PIL import Image, ImageDraw
import numpy as np
W, LOIKA = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
R2 = os.path.join(LOIKA, "round2"); IMG = os.path.join(R2, "img"); os.makedirs(IMG, exist_ok=True)
R1 = os.path.join(LOIKA, "img")
GROUND, GLASS = (0xD6, 0xCE, 0xBE, 255), (0x20, 0x26, 0x2C, 255)
def on(path, bg, zoom=1, box=None):
    im = Image.open(path).convert("RGBA"); base = Image.new("RGBA", im.size, bg); base.alpha_composite(im)
    if box: base = base.crop(box)
    return base.resize((base.width * zoom, base.height * zoom), Image.NEAREST if zoom > 1 else Image.LANCZOS)
def save(im, name):
    im.convert("RGB").save(os.path.join(IMG, name)); return "img/" + name
src = {"master": lambda s: f"{R1}/master-{s}.png", "sdf": lambda s: f"{R1}/sdf-{s}.png", "r1": lambda s: f"{R1}/s5-loika-{s}.png",
       "r2": lambda s: f"{W}/s5/loika-{s}.png", "velvet": lambda s: f"{W}/velvet/loika-{s}.png"}
Z = {304: 1, 96: 3, 48: 5}
def cell(src_, cap, zoom=1): return f"<div class='cell'><img src='{src_}' style='zoom:{zoom}'><div class='cap'>{cap}</div></div>"
def lineup(keys, labels, bgname, bg, tag, sizes=(304, 96, 48)):
    out = []
    for s in sizes:
        cells = []
        for k, lb in zip(keys, labels):
            n = save(on(src[k](s), bg, Z[s]), f"{tag}-{k}-{s}-{bgname}.png"); cells.append(cell(n, f"{lb}, {s}" + (f" (shown {Z[s]}x)" if Z[s] > 1 else "")))
        out.append(f"<div class='row' style='margin-bottom:10px'>{''.join(cells)}</div>")
    return "".join(out)
M = json.load(open(os.path.join(W, "measures-all.json")))
L = json.load(open(os.path.join(W, "s5", "measures.json")))["light"]
def band(v, lo, hi): return "ok" if lo <= v <= hi else "warn"
rows = [("Shade over lit, flank of the body (linear)", f"{L['shade_over_lit']:.2f}", "0.94", "0.55-0.70", band(L['shade_over_lit'], .55, .70)),
        ("Cream in shade, L*", f"{L['cream_shade_L']:.1f}", "71", ">= 70", band(L['cream_shade_L'], 70, 100)),
        ("Nose minus lit muzzle, L*", f"{L['nose_minus_muzzle']:+.1f}", "-0.8", ">= -5 (master +9.2)", band(L['nose_minus_muzzle'], -5, 99)),
        ("Ring top minus bottom, L*", f"{L['ring_top_minus_bottom']:+.1f}", "+1.1", ">= -8", band(L['ring_top_minus_bottom'], -8, 99)),
        ("Iris crescent, L*", f"{L['iris_crescent_L']:.1f}", "55", "62-70", band(L['iris_crescent_L'], 62, 70)),
        ("Iris body, L*", f"{L['iris_body_L']:.1f}", "22", "13-33", band(L['iris_body_L'], 13, 33))]
lt = "".join(f"<tr><td>{a}</td><td class='{o}'>{b}</td><td>{c}</td><td>{d}</td><td class='{o}'>{'in band' if o == 'ok' else 'outside'}</td></tr>" for a, b, c, d, o in rows)
def m(k, f): return f(M[k])
cols = [("master", "Master"), ("sdf", "SDF"), ("r1", "Round 1"), ("r2", "Round 2")]
mrows = [("Cream L* (AD mask, median)", lambda d: f"{d['cream_L']:.1f}", "80-88"), ("Cream b*", lambda d: f"{d['cream_b']:.1f}", "about 21"),
         ("Body L* p10 / p50 / p90", lambda d: " / ".join(f"{x:.1f}" for x in d['body_L_p10_50_90']), "master 13.8 / 21.9 / 35"), ("Body b* (median)", lambda d: f"{d['body_b']:+.1f}", "about 0"),
         ("Head's forward-most point, y", lambda d: f"{d['head_front_y']:.0f}", "155-165"), ("Head top at x 180, y", lambda d: f"{d['head_top_y_at_x180']}", "master 107, SDF 102"),
         ("Far / near eye ring width", lambda d: f"{d['eye_ring_ratio']:.2f}", "0.60-0.70"), ("Eye line, far side up (deg)", lambda d: f"{d['eye_line_deg_far_up']:+.1f}", "master +9.5, SDF -5.4"),
         ("Partly transparent px far from the creature (haze)", lambda d: f"{d['partial_far_from_creature_px']}", "master 1134 (its own shadow)")]
mt = "<tr><th>Measure (304 sprite)</th>" + "".join(f"<th>{n}</th>" for _, n in cols) + "<th>Target</th></tr>" + "".join(f"<tr><td>{n}</td>" + "".join(f"<td>{f(M[k])}</td>" for k, _ in cols) + f"<td>{t}</td></tr>" for n, f, t in mrows)
# sample points drawn on the 304 sprite
im = on(src["r2"](304), (255, 255, 255, 255)); big = im.crop((0, 40, 304, 300)).resize((912, 780), Image.NEAREST); d = ImageDraw.Draw(big)
pc = {"lit body": (255, 0, 0), "shade body": (0, 0, 255), "cream in shade": (0, 160, 0), "nose": (255, 0, 255), "muzzle lit": (255, 140, 0), "ring top": (0, 200, 200), "ring bottom": (120, 0, 200), "iris crescent": (255, 255, 0), "iris body": (0, 0, 0)}
for k, pts in json.load(open(os.path.join(W, "s5", "measures.json")))["points"].items():
    for x, y in pts:
        X, Y = x * 3, (y - 40) * 3; d.ellipse((X - 5, Y - 5, X + 5, Y + 5), outline=pc[k], width=3)
sp = save(big, "sample-points.png")
legend = " ".join(f"<span style='color:rgb{v}'>&#9679;</span> {k}" for k, v in pc.items())
# the faces, the paws, the joins, the blink
face = lambda p, n: save(Image.open(p).convert("RGBA").convert("RGB"), n)
f1 = face(f"{R1}/s5-face3x.png", "face-r1.png"); f2 = face(f"{W}/s5/face3x.png", "face-r2.png")
box = (60, 215, 300, 312)
p1 = save(on(src["r1"](304), GROUND, 3, box), "paws-r1.png"); p2 = save(on(src["r2"](304), GROUND, 3, box), "paws-r2.png"); pm = save(on(src["master"](304), GROUND, 3, box), "paws-master.png")
p4 = face(f"{W}/s5/paws4x.png", "paws4x-r2.png")
bl = [face(f"{W}/blink/blink-{n}.png", f"blink-{n}.png") for n in ("rest", "half", "shut")]
tj = [face(f"{W}/s6/tjs-face-rest.png", "tjs-face-rest.png"), face(f"{W}/s6/tjs-face-blink.png", "tjs-face-blink.png")]
jn = {}
for leg in ("fore-L", "hind-L"):
    for nm in ("rest", "fwd30", "back30"):
        jn[(leg, nm)] = face(f"{W}/s4/B-{leg}-{nm}.png", f"join-{leg}-{nm}.png")
shape = lambda leg: "".join(cell(jn[(leg, nm)], f"{leg.replace('-L', '')} leg, {t}") for nm, t in (("rest", "rest"), ("fwd30", "30 degrees forward"), ("back30", "30 degrees back")))
body = f"""<h1>Loika in the mesh pipeline, round 2: the mesh's own faults</h1>
<div class='sub'>Master, SDF (pinned house commit), round 1 and round 2, on the house ground #D6CEBE. Pictures are shown 1x at 304, 3x at 96 and 5x at 48. Round 2 is flat-lit (the velvet skin is on <a href='7-skin.html'>7-skin</a>). The head's shape is the house's: not changed here.</div>
<h2>304 x 312, 96 and 48 beside the master, on the house ground</h2>{lineup(['master', 'sdf', 'r1', 'r2'], ['Master', 'SDF', 'Round 1', 'Round 2'], 'g', GROUND, 'cmp')}
<h2>96 and 48 on dark glass (the shadow's haze would show here)</h2>{lineup(['master', 'sdf', 'r1', 'r2'], ['Master', 'SDF', 'Round 1', 'Round 2'], 'dk', GLASS, 'cmp', (96, 48))}
<h2>The numbers (AD gate's masks, 304 sprite)</h2><table>{mt}</table>
<h2>The five light measures and the two the gate added, in the house's light</h2>
<div class='row'><div class='cell'>{cell(sp, legend)}</div><div class='cell'><table><tr><th>Measure</th><th>Round 2</th><th>Round 1</th><th>House</th><th></th></tr>{lt}</table><div class='cap'>The shade over lit is sampled on the flank of the body (leg weight under 0.05, right of the head), on points the camera sees. The sphere calibration (calib.py): a body-albedo sphere gives shade over lit 0.58 with a diffuse-only lobe, and 0.94 on the dark body when the grey fill is reflected by the glossy lobe: that reflection was the flat light.</div></div></div>
<h2>The face at 3x: round 1 and round 2 (eyes in sockets, smile a line, nose with a highlight)</h2><div class='row'>{cell(f1, 'Round 1')}{cell(f2, 'Round 2')}</div>
<h2>The blink: Blender frames at rest, half and shut, and three.js frames of the glb (2x)</h2><div class='row'>{''.join(cell(b, t) for b, t in zip(bl, ['Rest', 'Half (lid halfway up the socket)', 'Shut']))}</div><div class='row' style='margin-top:10px'>{cell(tj[0], 'three.js, glb, rest (2x)')}{cell(tj[1], 'three.js, glb, blink peak (2x)')}</div>
<h2>The paws at 3x (bottom right of the 304 sprite): master, round 1, round 2; then the paws close</h2><div class='row'>{cell(pm, 'Master')}{cell(p1, 'Round 1')}{cell(p2, 'Round 2')}</div><div class='row' style='margin-top:10px'>{cell(p4, 'Round 2, the near paws at 3x of the 304 scale')}</div>
<h2>Join B on all four legs: rest and 30 degrees forward and back (the left legs; the right ones are their mirror)</h2><div class='row'>{shape('fore-L')}</div><div class='row' style='margin-top:10px'>{shape('hind-L')}</div>"""
page("Loika round 2", body, os.path.join(R2, "8-round2.html")); shot(os.path.join(R2, "8-round2.html"), os.path.join(R2, "8-round2.png"), 1500)
# the skin sheet
vm = json.load(open(os.path.join(W, "measures-all.json")))
def grain(path):
    a = np.array(Image.open(path).convert("RGBA")).astype(float); op = a[..., 3] > 250
    L = a[..., :3] @ [0.2126, 0.7152, 0.0722]; from numpy.lib.stride_tricks import sliding_window_view as sw
    m = op & (L < 110); box = sw(np.pad(L, 2, mode="edge"), (5, 5)).mean(axis=(2, 3)); hp = (L - box)[m]
    return float(hp.std())
gr = {k: grain(src[k](304)) for k in ("master", "r2", "velvet")}
sk = lineup(['master', 'r2', 'velvet'], ['Master', 'Round 2 flat', 'Round 2 velvet (look 1b)'], 'g', GROUND, 'skin')
crop = (150, 150, 300, 260)
cr = "".join(cell(save(on(src[k](304), GROUND, 4, crop), f"skin-crop-{k}.png"), f"{lb}, the flank at 4x of 304") for k, lb in (("master", "Master"), ("r2", "Round 2 flat"), ("velvet", "Round 2 velvet")))
body = f"""<h1>Loika round 2, the velvet skin (look 1b) beside the flat build</h1>
<div class='sub'>The lookdev's look 1b on the sprite build: grain 3 px at 304 stretched along one head-to-tail flow, mottle, light flecks, micro bump, warm sheen and a cool fuzz rim off the cream, pixel filter 1.0. The glb keeps the flat material. The silhouette is the mesh's own.</div>
<h2>304, 96 (3x) and 48 (5x)</h2>{sk}<h2>The flank at 4x</h2><div class='row'>{cr}</div>
<table><tr><th>High-pass grain std on body pixels (5 px box)</th><td>master {gr['master']:.2f}, flat {gr['r2']:.2f}, velvet {gr['velvet']:.2f}</td></tr></table>"""
page("Loika round 2, velvet", body, os.path.join(R2, "7-skin.html")); shot(os.path.join(R2, "7-skin.html"), os.path.join(R2, "7-skin.png"), 1100)
print("sheets ok", gr)
