"""S20 chunk 5 picture: 5-skin. The type specimen skinned from 10 angles, 304 / 96 / 48 in the house three-quarter view, three palettes and six layouts, the new coat genes one by one (reaction-diffusion spots and labyrinth, rosettes, bands, marks, brow stripe, freckles, glow bleed), eye frames and mouth expressions, the UV atlas, the measured rows.
Run (bpy venv): python sheet_s20_5.py [OUTDIR]"""
import sys, os, json, time
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20build, s20render as RN, s20uv as UV, sheetlib as SL, s20views as SV, gates

OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else "/home/mb/mb/iwq/results/T-20261101-mesh/newspecies/build"
PIC = os.path.join(OUT, "c5")
os.makedirs(PIC, exist_ok=True)
POSE = os.environ.get("S20_POSE", "rest")
b = s20build.make_s20(upto="base")
rig = pose = None
if POSE == "stand":
    import s20rig
    rig = s20rig.Rig(b.ctx)
    pose = rig.stand_pose()
TYPE = dict(palette="dusk", layout="plain")
t0 = time.time()
AZ = 32.0


def shot(g, name, az=AZ, el=10.0, w=300, h=400, ppH=118.0, cen=(-0.3, 0, 1.2), frame="open", level=4, samples=32):
    P = RN.prepare(b, g, level=level, frame=frame, pose=pose, rig=rig)
    p = os.path.join(PIC, name + ".png")
    a, cam = RN.render(P, g, p, 304, az=az, el=el, centre=cen, samples=samples, wh=(w, h), ppH=ppH)
    RN.to_png(a, p)
    return name + ".png", P


def img(name, w, cap="", pix=False):
    st = " style='image-rendering:pixelated'" if pix else ""
    return f"<div class='cell'><div class='cap'>{cap}</div><img src='c5/{name}' width='{w}'{st}></div>"


body = ["<h1>S20 Tuliko, chunk 5: skin and face</h1>",
        "<p>The coat is where Tuliko becomes itself. Every colour and glow below is a function of the surface point (its island coordinates, position and normal) and the coat genome; nothing is painted by hand. "
        "Level-4 mesh, vertex colour plus emission, velvet material (rough 0.66, sheen, grain bump), Cycles, house light. Pose: " + ("stand" if POSE == "stand" else "rest (the stand pose arrives with the rig, chunk 6)") + ".</p>"]
# the type, 10 angles
cells = []
for name, az, el in [(f"az{a:03d}", float(a), 10.0) for a in range(0, 360, 45)] + [("top", 0.0, 89.0), ("bottom", 0.0, -89.0)]:
    n, _ = shot(TYPE, "type-" + name, az=az, el=el, w=300, h=400, ppH=120.0 if el < 80 else 100.0)
    cells.append(f"<div class='cell'><img src='c5/{n}' width='300'><div class='cap'>{name}</div></div>")
body.append("<h2>The type specimen: dusk, plain layout, from 10 angles</h2><div class='grid' style='grid-template-columns:repeat(5,300px)'>" + "".join(cells) + "</div>")
# 304 / 96 / 48
row = []
for size, pw in ((304, 304), (96, 384), (48, 288)):
    g = TYPE
    P = RN.prepare(b, g, level=4, pose=pose, rig=rig)
    p = os.path.join(PIC, f"house-{size}.png")
    w_, h_, ppH = RN.SIZES[size]
    a, cam = RN.render(P, g, p, size, az=AZ, el=10.0, centre=(-0.35, 0, 1.3 if size != 48 else 1.25), samples=48)
    RN.to_png(a, p)
    row.append(img(f"house-{size}.png", pw, f"{size} px" + (" (shown 4x)" if size == 96 else (" (shown 6x)" if size == 48 else "")), pix=size != 304))
body.append("<h2>The house three-quarter view at 304 / 96 / 48</h2><div class='row'>" + "".join(row) + "</div>")
# palettes and layouts
cells = []
for pal in ("dusk", "lagoon", "ember"):
    n, _ = shot(dict(palette=pal, layout="plain"), f"pal-{pal}")
    cells.append(img(n, 220, f"palette {pal}"))
body.append("<h2>Three palettes (plain layout)</h2><div class='row'>" + "".join(cells) + "</div>")
cells = []
for lay, pal in (("plain", "dusk"), ("masked", "ember"), ("points", "lagoon"), ("banded", "dusk"), ("spotted", "ember"), ("capped", "lagoon")):
    n, _ = shot(dict(palette=pal, layout=lay), f"lay-{lay}")
    cells.append(img(n, 220, f"layout {lay} ({pal})"))
body.append("<h2>Six layouts</h2><div class='row'>" + "".join(cells) + "</div>")
# the coat genes
genes = [("rd spots", dict(palette="lagoon", rd="spots", rd_contrast=0.6)), ("rd labyrinth", dict(palette="dusk", rd="labyrinth", rd_contrast=0.55)),
         ("rd rings", dict(palette="ember", rd="rings", rd_contrast=0.5)), ("rosettes", dict(palette="ember", layout="spotted", rosette=0.9)),
         ("banded x7", dict(palette="lagoon", layout="banded", bands=7)), ("heart mark", dict(palette="dusk", mark="heart", mark_where="forehead")),
         ("star mark (cheek)", dict(palette="ember", mark="star", mark_where="cheek", mark_size=0.09)), ("brow stripe", dict(palette="lagoon", brow=1.0)),
         ("many freckles", dict(palette="dusk", freckle_density=1.0, freckle_glow=1.0)), ("long bleed", dict(palette="ember", bleed=0.9, glow=1.0, gradient=0.45)),
         ("hue shift +0.08", dict(palette="dusk", hue_shift=0.08, gradient=0.4)), ("high fleck", dict(palette="lagoon", fleck=0.8, gradient=0.5))]
cells = []
for nm, g in genes:
    n, _ = shot(g, "gene-" + nm.replace(" ", "-").replace("(", "").replace(")", ""), w=240, h=320, ppH=95.0)
    cells.append(img(n, 200, nm))
body.append("<h2>The coat genes, one at a time</h2><div class='row' style='flex-wrap:wrap'>" + "".join(cells) + "</div>")
# glow
cells = []
for gl in (0.6, 0.8, 1.0):
    n, _ = shot(dict(palette="dusk", glow=gl), f"glow-{int(gl * 10)}", w=240, h=320, ppH=95.0)
    cells.append(img(n, 200, f"glow {gl}"))
body.append("<h2>Glow 0.6 / 0.8 / 1.0 (the lantern, the freckles and the bleed down the tail; the pulse 0.8-1.0 over 2.4 s is a runtime scale of the emission)</h2><div class='row'>" + "".join(cells) + "</div>")
# face
cells = []
for fr in ("open", "half", "closed"):
    n, _ = shot(dict(palette="dusk", mark="heart"), f"eye-{fr}", w=300, h=300, ppH=330.0, cen=(0.2, 0, 1.55), el=5.0, az=20.0, frame=fr, samples=32)
    cells.append(img(n, 300, f"eyes {fr}"))
for ex in ("smile", "o", "flat"):
    n, _ = shot(dict(palette="dusk", expression=ex), f"mouth-{ex}", w=300, h=300, ppH=330.0, cen=(0.2, 0, 1.55), el=5.0, az=20.0, samples=32)
    cells.append(img(n, 300, f"mouth {ex} (blush on)"))
body.append("<h2>Eye frames (a blink is a colour swap: the outline is the same pixels) and the mouth</h2><div class='row' style='flex-wrap:wrap'>" + "".join(cells) + "</div>")
# the UV atlas
rich = dict(palette="ember", layout="banded", rd="spots", mark="star", brow=0.0, rosette=0.5)
P = RN.prepare(b, rich, level=3)
UV.render_atlas(b.ctx, b.parts, P, os.path.join(PIC, "atlas.png"), size=1400)
res = UV.island_stretch_mesh(b, 2)
rows = [(k, f"{v['median']:.2f}", f"{v['p95']:.2f}", f"{v['p99']:.1f}", v["faces"], SL.status(v["p95"] <= 1.3)) for k, v in res.items()]
body.append("<h2>The UV atlas (this individual: ember, banded, spots, star), 1 H = 380 px; the loft island has the face and belly mid-island and the seam on the back line</h2>"
            f"<div class='row'><div class='cell'><img src='c5/atlas.png' width='900'></div><div>" + SL.table(rows, ["island", "stretch median", "p95", "p99", "faces", "p95 <= 1.3"]) +
            "<p>Stretch = sigma max / sigma min of the 3D to UV map on the level-2 quads. Pole caps, bridge bands, toe beads are left out of the figures. Physical-unit islands: the loft is cut into a cylinder and two planar caps; tubes are rolled out round their path.</p></div></div>")
open(os.path.join(OUT, "5-skin.html"), "w").write(SL.page("S20 chunk 5 skin", "".join(body)))
SL.shoot(os.path.join(OUT, "5-skin.html"), os.path.join(OUT, "5-skin.png"), 1700)
print("ok", round(time.time() - t0), "s")
