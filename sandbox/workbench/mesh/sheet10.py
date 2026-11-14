"""Round 4 sheets (cadvenv python, PIL + Playwright): 11-round4 (master, SDF fix 8, mesh round 3 and round 4 at 304, 96 and 48; the numbers; the face and the lower face) and 12-blink (rest, half and shut in
Blender and in three.js; the outline difference).   python sheet10.py WORKDIR LOIKA_DIR      WORKDIR holds sdf/ s5/ s6/ bl/.  HTML with real text (DejaVu Sans, 14 px and up) beside the PNG."""
import os, sys, json, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, "tools"))
from sheetlib import page, shot
from measure import measure
from PIL import Image
import numpy as np
from tjsmeasure import tjs_measure
W, LOIKA = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
R4 = os.path.join(LOIKA, "round4"); IMG = os.path.join(R4, "img"); os.makedirs(IMG, exist_ok=True)
R1, R3 = os.path.join(LOIKA, "img"), os.path.join(LOIKA, "round3", "img")
GROUND = (0xD6, 0xCE, 0xBE, 255); Z = {304: 1, 96: 3, 48: 5}
MASTER304 = "/home/mb/mb/mp/art/station-masters/pods/adult/mibi-adult-S01-304x312.png"
def comp(path, bg=GROUND):
    im = Image.open(path).convert("RGBA"); base = Image.new("RGBA", im.size, bg); base.alpha_composite(im); return base
SRC = {"master": lambda s: f"{R1}/master-{s}.png", "sdf": lambda s: f"{W}/sdf/sdf-S01-{s}.png", "r3": lambda s: f"{R3}/loika-r3-{s}.png", "r4": lambda s: f"{W}/s5/loika-{s}.png"}
KEYS = [("master", "Master"), ("sdf", "SDF fix 8 (b3e1e9a3e)"), ("r3", "Mesh round 3"), ("r4", "Mesh round 4")]
def zoom(im, z, box=None):
    if box: im = im.crop(box)
    return im.resize((im.width * z, im.height * z), Image.NEAREST)
def save(im, name): im.convert("RGB").save(os.path.join(IMG, name)); return "img/" + name
def cell(s, cap): return f"<div class='cell'><img src='{s}'><div class='cap'>{cap}</div></div>"
for s in (304, 96, 48): Image.open(SRC["r4"](s)).save(os.path.join(IMG, f"loika-r4-{s}.png"))
lineup = ""
for s in (304, 96, 48):
    lineup += "<div class='row' style='margin-bottom:10px'>" + "".join(cell(save(zoom(comp(SRC[k](s)), Z[s]), f"cmp-{k}-{s}.png"), f"{lb}, {s}" + (f" (shown {Z[s]}x)" if Z[s] > 1 else "")) for k, lb in KEYS) + "</div>"
M = {k: measure(SRC[k](304)) for k, _ in KEYS}
LN = subprocess.run(["node", os.path.join(HERE, "tools/lowernum.mjs"), SRC["sdf"](304), SRC["r4"](304)], capture_output=True, text=True, cwd=os.path.dirname(HERE)).stdout.strip().splitlines()
S5 = json.load(open(os.path.join(W, "s5", "measures.json"))); L = S5["light"]
TJ = tjs_measure(os.path.join(W, "s6", "tjs-rest.png"))
def bandc(v, lo, hi): return "ok" if lo <= v <= hi else "warn"
mrows = [("Cream b*", lambda d: f"{d['cream_b']:.1f}", "21 +/- 2 (master 21.5)", lambda d: bandc(d['cream_b'], 19, 23)),
         ("Cream L* (median)", lambda d: f"{d['cream_L']:.1f}", "master 80.4: the mesh's cream is darker", lambda d: ""),
         ("Body L* p10 / p50 / p90", lambda d: " / ".join(f"{x:.1f}" for x in d['body_L_p10_50_90']), "master 13.8 / 21.9 / 35.3, each within 2", lambda d: "ok" if all(abs(a - b) <= 2 for a, b in zip(d['body_L_p10_50_90'], (13.8, 21.9, 35.3))) else "warn"),
         ("Partly transparent px far from the creature", lambda d: f"{d['partial_far_from_creature_px']}", "at most 1500 (master 1134)", lambda d: bandc(d['partial_far_from_creature_px'], 0, 1500)),
         ("Head's forward-most point, y", lambda d: f"{d['head_front_y']:.0f}", "155 to 165", lambda d: bandc(d['head_front_y'], 155, 165)),
         ("Far / near eye ring width", lambda d: f"{d['eye_ring_ratio']:.2f}", "0.30 to 0.45 (the AD re-centred the band on the master)", lambda d: "")]
mt = "<tr><th>Measure (304 sprite)</th>" + "".join(f"<th>{n}</th>" for _, n in KEYS) + "<th>Target</th></tr>" + "".join(f"<tr><td>{n}</td>" + "".join(f"<td class='{c(M[k])}'>{f(M[k])}</td>" for k, _ in KEYS) + f"<td>{t}</td></tr>" for n, f, t, c in mrows)
lt = f"<table><tr><th>Light measure, the mesh in the house's light</th><th>Round 4</th></tr><tr><td>Cream in shade, L*</td><td>{L['cream_shade_L']:.1f}</td></tr><tr><td>Nose minus lit muzzle, L*</td><td>{L['nose_minus_muzzle']:+.1f}</td></tr><tr><td>Ring top minus bottom, L*</td><td>{L['ring_top_minus_bottom']:+.1f}</td></tr><tr><td>Iris crescent / body, L*</td><td>{L['iris_crescent_L']:.1f} / {L['iris_body_L']:.1f}</td></tr><tr><td>Shade over lit (flank samples)</td><td>{L['shade_over_lit']:.2f}</td></tr></table>"
tt = f"<table><tr><th>glb in three.js (rest, 960 px)</th><th>Blender sprite</th><th>three.js</th><th>Within 3</th></tr><tr><td>Cream L*</td><td>{M['r4']['cream_L']:.1f}</td><td>{TJ['cream_L']}</td><td class='{bandc(abs(TJ['cream_L'] - M['r4']['cream_L']), 0, 3)}'>{abs(TJ['cream_L'] - M['r4']['cream_L']):.1f}</td></tr><tr><td>Cream b*</td><td>{M['r4']['cream_b']:.1f}</td><td>{TJ['cream_b']}</td><td class='{bandc(abs(TJ['cream_b'] - M['r4']['cream_b']), 0, 3)}'>{abs(TJ['cream_b'] - M['r4']['cream_b']):.1f}</td></tr><tr><td>Body L* median</td><td>{M['r4']['body_L_p10_50_90'][1]:.1f}</td><td>{TJ['body_L_p10_50_90'][1]}</td><td class='{bandc(abs(TJ['body_L_p10_50_90'][1] - M['r4']['body_L_p10_50_90'][1]), 0, 3)}'>{abs(TJ['body_L_p10_50_90'][1] - M['r4']['body_L_p10_50_90'][1]):.1f}</td></tr><tr><td>Body b* median</td><td>{M['r4']['body_b']:.1f}</td><td>{TJ['body_b']}</td><td class='{bandc(abs(TJ['body_b'] - M['r4']['body_b']), 0, 3)}'>{abs(TJ['body_b'] - M['r4']['body_b']):.1f}</td></tr></table>"
lntxt = "<br>".join(x.replace("<", "&lt;") for x in LN)
fbox = (0, 105, 175, 225)
fr = lambda k: save(zoom(comp(SRC[k](304)), 3, fbox), f"face304-{k}.png")
l96 = lambda k: save(zoom(comp(SRC[k](96)), 6, (2, 28, 54, 66)), f"face96-{k}.png")
body = f"""<h1>Loika in the mesh pipeline, round 4: fix 8's lower face, the blink, value</h1>
<div class='sub'>Master, SDF fix 8 (b3e1e9a3e, the house the mesh now takes), mesh round 3 and mesh round 4 on the house ground #D6CEBE; 1x at 304, 3x at 96, 5x at 48. The lobe, muzzle, nose, smile and the cream's top edge are fix 8's numbers read by name
(provisional: fix 9 is changing them); the jaw, chin, throat, chest, far leg, cream field and leaves are the frozen numbers.</div>
<h2>304 x 312, 96 and 48 beside the master</h2>{lineup}
<h2>The numbers (the AD gate's masks, 304 sprite)</h2><table>{mt}</table>
<div class='row' style='margin-top:10px'><div class='cell'>{lt}</div><div class='cell'>{tt}<div class='cap'>The viewer's light was tuned to the sprite's values (hemisphere and sun colours and strengths) and its body colour taken up 14 % in sRGB: three's standard material has none of Blender's subsurface lift or vinyl sheen. The cream's own albedo (x1.12 red and green) is in the glb's colours and the sprite's alike.</div></div></div>
<h2>The lower face as the AD reads it (lowernum.mjs: foundation/lowerface.mjs's numbers, on the master's frame; SDF fix 8 first, then mesh round 4)</h2>
<div class='cell'><code>{lntxt}</code></div>
<h2>The face at 3x of 304 and the lower face at 96 (6x)</h2>
<div class='row'>{cell(fr('master'), 'Master')}{cell(fr('sdf'), 'SDF fix 8')}{cell(fr('r3'), 'Mesh round 3')}{cell(fr('r4'), 'Mesh round 4')}</div>
<div class='row' style='margin-top:10px'>{cell(l96('master'), 'Master, 96 at 6x')}{cell(l96('sdf'), 'SDF fix 8')}{cell(l96('r3'), 'Round 3')}{cell(l96('r4'), 'Round 4')}</div>"""
page("Loika round 4", body, os.path.join(R4, "11-round4.html")); shot(os.path.join(R4, "11-round4.html"), os.path.join(R4, "11-round4.png"), 1500)
# ---- the blink
od = {}
for s in (304, 96):
    a = [np.array(Image.open(f"{W}/bl/blink-{t}-{s}.png"))[..., 3] > 128 for t in ("rest", "shut")]; od[s] = int((a[0] ^ a[1]).sum())
bl = lambda t: save(comp(f"{W}/bl/blink-{t}-face3x.png"), f"blink-bl-{t}.png")
tj = lambda t: save(Image.open(f"{W}/s6/tjs-face-{t}.png").convert("RGB").resize((480, 480), Image.LANCZOS), f"blink-tjs-{t}.png")
body = f"""<h1>Loika round 4, the blink: rest, half and shut</h1>
<div class='sub'>The lid is a shell on the eyeball inside the socket: a disc 0.009 H in front of the open eye's surface (the limit is 0.02 H), folded into a line under the skin over the hole's top rim at rest and swept down across the eye by the blink key.
Its texture is the body's albedo with a lit top and a darker bottom, and one soft crease, 2 px wide at 304, that sags in the middle (the lash line of a content closed eye). Outline difference between rest and shut: <b>{od[304]} px at 304 and {od[96]} px at 96</b> (alpha above 128).</div>
<h2>Blender (face at 3x of 304): rest, half, shut</h2><div class='row'>{cell(bl('rest'), 'Rest')}{cell(bl('half'), 'Half (key 0.5): the lid is mid-sweep, a band across the eye')}{cell(bl('shut'), 'Shut (key 1): a flat lid in the socket with the crease')}</div>
<h2>The glb in three.js (rendered 2x, shown 1x): rest, half, shut</h2><div class='row'>{cell(tj('rest'), 'Rest')}{cell(tj('half'), 'Half (clip time 0.083 s, weight 0.5)')}{cell(tj('blink'), 'Shut (clip time 0.125 s, weight 1.0: the clip peaks there; the earlier sheets took 0.104 s, weight 0.75)')}</div>"""
page("Loika round 4, the blink", body, os.path.join(R4, "12-blink.html")); shot(os.path.join(R4, "12-blink.html"), os.path.join(R4, "12-blink.png"), 1560)
print("sheets ok", od)
