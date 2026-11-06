#!/usr/bin/env python3
# The Family screen's light set (the collection inventory spec §8, "Light" and "Lines"; the lineage2 notes for the colours' roles). The face only places pictures 1:1 with plain alpha, so all light is baked art, built once here, nothing animates.
# Palette tokens only (palettes/station.json). Every number below is §8's; where §8 left one open, the reading taken (the stricter, the smaller) is marked READ and listed in the report.
#   family-field-706x519          `ground` at the edge, lifted warm toward (344, 250) screen = (344, 209) in the field (radius 360 x 300, squared falloff), the lift held in 6 steps over the outer 30%, the centre's bloom (186 x 124, `amber` 38% at its core) baked in. Opaque.
#   family-pool-<role>-WxH        under each creature: an ellipse w*0.85 by w*0.22 of `amber` at 42% with a core w*0.45 by w*0.11 of `sand` at 50%; alpha scaled by the role's strength (centre 1.7, parents 0.9, young 0.7, mate 0.5), baked in.
#                                 w is the creature's stand width (centre 124, parents 92, young 72, mate 48). READ: the role scale is the pool's strength (the lineage2 notes: "pool strength by role"), not its size. Centred under the feet.
#   family-shadow-w<w>-WxH        w*0.34 by w*0.075 of `void` at 80%, its centre w*0.04 to the right, the edge softened 3 px; one per stand width (124, 92, 72, 48), the canvas centred under the feet. Tucked and returned figures take this alone.
#   family-glow-h-64x14, -v-14x64 the line's glow strip, 14 px across, `amber` at 59% beside the core falling to 0 at +-7 px (linear), drawn under the 2 px `sand` core along every run (crop to the run's length).
#   family-node-6-18x18, -4-18x18 a 6 px (or 4 px) `bone` disc in a halo of `amber` at 55% falling to 0 at its edge: 14 px round the 6, READ 10 px round the 4; the disc centred, at every join and end (the mate's drop and a young's top take the 4).
#   family-returned-92x94         the returned parent's silhouette: its species' stand at 92/304 (S01 adult), flat `hairline`, the stand's own alpha, 1:1 (placed on the parent's feet like the stand).
# Also writes slices/family.json, slices/family-status.json, and four proofs at 1x (proof-family-<a..d>-1x.png, each a whole 706 x 519 field): the lines, nodes, pools, shadows and stands in four families (one group; a returned parent; no young; several groups).
#   python3 art/station-masters/collection/source/family_light.py
import os, json, hashlib, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.normpath(os.path.join(HERE, "..")); REPO = os.path.normpath(os.path.join(ROOT, "../../.."))
PAL = {n: h for n, h in json.load(open(os.path.join(REPO, "prototypes/ui/palettes/station.json")))["colours"]}
rgb = lambda n: tuple(int(PAL[n][i:i + 2], 16) for i in (1, 3, 5))
OUT = os.path.join(ROOT, "slices"); os.makedirs(OUT, exist_ok=True)
made = {}
def layer(w, h, color, alpha):          # a straight-alpha RGBA from a colour and an alpha array (0..1)
    a = np.zeros((h, w, 4), np.uint8); a[..., :3] = color; a[..., 3] = np.rint(np.clip(alpha, 0, 1) * 255).astype(np.uint8); return Image.fromarray(a, "RGBA")
def ellipse_alpha(w, h, rx, ry, peak, power=1.5, cx=None, cy=None):   # radial alpha: peak at the centre, falling to 0 at the ellipse's edge
    cx = w / 2 if cx is None else cx; cy = h / 2 if cy is None else cy
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float64); d = np.sqrt(((xx + .5 - cx) / rx) ** 2 + ((yy + .5 - cy) / ry) ** 2)
    return peak * np.clip(1 - d, 0, 1) ** power

# ---- the field ----
FW, FH, DY = 706, 519, 41
yy, xx = np.mgrid[0:FH, 0:FW].astype(np.float64)
cx, cy = 344.0, 250.0 - DY
lift = np.clip(1 - np.sqrt(((xx + .5 - cx) / 360) ** 2 + ((yy + .5 - cy) / 300) ** 2), 0, 1) ** 2 * 0.14        # READ: the lift's peak, `amber` at 14%
u = np.maximum(np.abs(xx + .5 - FW / 2) / (FW / 2), np.abs(yy + .5 - FH / 2) / (FH / 2))                        # 0 at the middle, 1 at the edge
k = np.clip(np.ceil((u - 0.7) / 0.05), 0, 6); lift *= (6 - k) / 6                                                # 6 steps over the outer 30%: whole to nothing at the edge
f = Image.new("RGBA", (FW, FH), rgb("ground") + (255,)); f.alpha_composite(layer(FW, FH, rgb("amber"), lift))
bloom = layer(186, 124, rgb("amber"), ellipse_alpha(186, 124, 93, 62, 0.38, 2.0)); f.alpha_composite(bloom, (344 - 93, int(cy) - 62))
made["family-field-706x519"] = f

# ---- pools and shadows, at the four stand widths ----
ROLES = {"centre": (124, 1.7), "parent": (92, 0.9), "young": (72, 0.7), "mate": (48, 0.5)}
for role, (w, s) in ROLES.items():
    pw, ph = round(w * 0.85), round(w * 0.22); W, H = pw + 2, ph + 2
    a = layer(W, H, rgb("amber"), ellipse_alpha(W, H, pw / 2, ph / 2, min(1, 0.42 * s)))
    cw, ch = round(w * 0.45), round(w * 0.11)
    a.alpha_composite(layer(W, H, rgb("sand"), ellipse_alpha(W, H, cw / 2, ch / 2, min(1, 0.50 * s))))
    made[f"family-pool-{role}-{W}x{H}"] = a
for role, (w, s) in ROLES.items():
    sw, sh, off, pad = round(w * 0.34), round(w * 0.075), round(w * 0.04), 6
    W, H = sw + 2 * off + 2 * pad, sh + 2 * pad
    m = Image.new("L", (W * 4, H * 4), 0); ImageDraw.Draw(m).ellipse([(W / 2 + off - sw / 2) * 4, (H / 2 - sh / 2) * 4, (W / 2 + off + sw / 2) * 4 - 1, (H / 2 + sh / 2) * 4 - 1], fill=255)
    m = m.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.5))                                       # a 3 px soft edge
    made[f"family-shadow-w{w}-{W}x{H}"] = layer(W, H, rgb("void"), np.asarray(m).astype(np.float64) / 255 * 0.80)

# ---- glow strips ----
d = np.abs(np.arange(14) + .5 - 7.0); prof = 0.59 * np.clip(1 - (d - 1) / 6, 0, 1); prof[d < 1] = 0.59
made["family-glow-h-64x14"] = layer(64, 14, rgb("amber"), np.tile(prof[:, None], (1, 64)))
made["family-glow-v-14x64"] = layer(14, 64, rgb("amber"), np.tile(prof[None, :], (64, 1)))

# ---- nodes ----
def node(disc, halo):
    yy, xx = np.mgrid[0:18, 0:18].astype(np.float64); r = np.sqrt((xx + .5 - 9) ** 2 + (yy + .5 - 9) ** 2)
    n = layer(18, 18, rgb("amber"), 0.55 * np.clip(1 - r / (halo / 2), 0, 1))
    dm = np.clip(disc / 2 + .5 - r, 0, 1); n.alpha_composite(layer(18, 18, rgb("bone"), dm)); return n
made["family-node-6-18x18"] = node(6, 14); made["family-node-4-18x18"] = node(4, 10)

# ---- the returned parent's silhouette: its species' own stand at 92/304 (S01 adult, no looks), flat `hairline`, the stand's alpha kept, precomputed, 1:1 ----
_st = Image.open(os.path.join(REPO, "prototypes/ui/assets/stands/S01-adult-304x312-base.png")).convert("RGBA").resize((92, round(312 * 92 / 304)), Image.LANCZOS)
RET = _st.size
made[f"family-returned-{RET[0]}x{RET[1]}"] = layer(RET[0], RET[1], rgb("hairline"), np.asarray(_st)[..., 3].astype(np.float64) / 255)

manifest, status = {}, {}
for name, im in made.items():
    p = os.path.join(OUT, name + ".png"); im.save(p)
    manifest[name] = {"size": list(im.size), "src": "source/family_light.py", "sha256": hashlib.sha256(open(p, "rb").read()).hexdigest()}
    status[name] = {"status": "new", "note": "baked by script from the collection inventory spec §8, for the art director's 1x proof"}
for fn, d_ in (("family.json", manifest), ("family-status.json", status)):
    json.dump(d_, open(os.path.join(OUT, fn), "w"), indent=1); open(os.path.join(OUT, fn), "a").write("\n")
G = lambda pre: next(v for k_, v in made.items() if k_.startswith(pre))

# ---- the proofs ----
STANDS = os.path.join(REPO, "prototypes/ui/assets/stands"); FONT = os.path.join(REPO, "prototypes/ui/fonts/inter/src")
def font(sz, w="Regular"): return ImageFont.truetype(os.path.join(FONT, f"Inter-{w}-tnum.ttf"), sz)
def stand(pose, base, w, gain, look=None):
    im = Image.open(os.path.join(STANDS, f"S01-{pose}-304x312-base{'-' + base.replace(' ', '-') if base else ''}.png")).convert("RGBA")
    if look: im.alpha_composite(Image.open(os.path.join(STANDS, f"S01-{pose}-304x312-{look}.png")).convert("RGBA"))
    a = np.asarray(im).astype(np.float64); a[..., :3] = np.clip(a[..., :3] * gain, 0, 255)
    im = Image.fromarray(a.astype(np.uint8), "RGBA"); return im.resize((w, round(312 * w / 304)), Image.LANCZOS)
def proof(name, build):
    c = G("family-field").copy(); build(Scene(c)); c.convert("RGB").save(os.path.join(ROOT, name))
class Scene:
    def __init__(s, c): s.c = c
    def at(s, im, x, y): s.c.alpha_composite(im, (int(x), int(y - DY)))                  # screen coordinates in, field coordinates out
    def text(s, x, y, t, sz, col, anchor="ls", w="Regular"): ImageDraw.Draw(s.c).text((x, y - DY), t, font=font(sz, w), fill=rgb(col) + (255,), anchor=anchor)
    def line(s, x0, y0, x1, y1, op=1.0, glow=True, col="sand"):                                       # a 2 px run: glow under, core over (axis-aligned)
        x0, x1 = sorted((x0, x1)); y0, y1 = sorted((y0, y1))
        if x0 == x1:
            L = y1 - y0
            if glow: s.at(fade(crop_tile(G("family-glow-v"), "v", L), op), x0 - 7, y0)
            s.at(fade(Image.new("RGBA", (2, L), rgb(col) + (255,)), op), x0 - 1, y0)
        else:
            L = x1 - x0
            if glow: s.at(fade(crop_tile(G("family-glow-h"), "h", L), op), x0, y0 - 7)
            s.at(fade(Image.new("RGBA", (L, 2), rgb(col) + (255,)), op), x0, y0 - 1)
    def node(s, x, y, size=6, op=1.0): s.at(fade(G(f"family-node-{size}"), op), x - 9, y - 9)
    def creature(s, role, cx, feet, im, pool=True):
        w = ROLES[role][0]
        if pool: s.at(G(f"family-pool-{role}"), cx - G(f"family-pool-{role}").width / 2, feet - G(f"family-pool-{role}").height / 2)
        sh = G(f"family-shadow-w{w}"); s.at(sh, cx - sh.width / 2, feet - sh.height / 2)
        s.at(im, cx - im.width / 2, feet - round(305 * w / 304))
def fade(im, op):
    if op >= 1: return im
    a = np.asarray(im).copy(); a[..., 3] = np.rint(a[..., 3] * op).astype(np.uint8); return Image.fromarray(a, "RGBA")
def crop_tile(tile, axis, L):
    out = Image.new("RGBA", (tile.width, L) if axis == "v" else (L, tile.height))
    for i in range(0, L, 64): out.alpha_composite(tile.crop((0, 0, 14, min(64, L - i))) if axis == "v" else tile.crop((0, 0, min(64, L - i), 14)), (0, i) if axis == "v" else (i, 0))
    return out
def centre_and_parents(sc, centre_look, parents):
    sc.text(24, 56, "Parents", 13, "fog")
    for (cx, base, name, ret) in parents:
        if ret:
            sc.creature("parent", cx, 132, G("family-returned"), pool=False); sc.text(cx, 156, "Returned", 14, "fog", "ms")
            sc.line(cx, 160, cx, 177, glow=False, col="stone"); sc.line(cx, 176, 344, 176, glow=False, col="stone")
        else:
            sc.creature("parent", cx, 132, stand("adult", base, 92, 0.92)); sc.text(cx, 156, name, 14, "bone", "ms")
    if not any(p[3] for p in parents): sc.line(248, 176, 440, 176)
    else: sc.line(344, 176, [p[0] for p in parents if not p[3]][0], 176)
    cim = stand("adult", *centre_look[:1], 124, 1.08, *(centre_look[1:] or [None])); sc.creature("centre", 344, 304, cim)
    ink_top = 304 - round(305 * 124 / 304) + cim.getbbox()[1]
    if ink_top - 6 >= 186: sc.line(344, 177, 344, ink_top - 6); sc.node(344, ink_top - 6, 4)
    sc.text(344, 333, "Fen", 17, "bone", "ms", "Medium")
    for (cx, base, name, ret) in parents:
        if ret: continue
        sc.line(cx, 160, cx, 177); sc.node(cx, 160)
    sc.node(344, 177); sc.node(248, 177) ; sc.node(440, 177)
def family_a(sc):   # one group, centred: the mate and two young
    centre_and_parents(sc, ("russet", "patches"), [(248, "ash", "Hazel", False), (440, "russet and ash", "Orrin", False)])
    sc.text(24, 330, "Young · 2", 13, "fog"); sc.line(344, 341, 344, 352); sc.line(252, 352, 436, 352); sc.node(344, 352)
    cells = [(252, "mate", "charcoal and russet", "with Bram"), (344, "young", "russet", "Moss"), (436, "young", "ash", "Wren")]
    for cx, role, base, name in cells:
        sc.line(cx, 352, cx, 368, 0.75 if role == "mate" else 1.0); sc.node(cx, 368, 4, 0.75 if role == "mate" else 1.0)
        sc.creature(role, cx, 436, stand("adult" if role == "mate" else "juvenile", base, ROLES[role][0], 0.92)); sc.text(cx, 452, name, 13, "fog" if role == "mate" else "bone", "ms")
def family_b(sc):   # a returned parent, one young
    centre_and_parents(sc, ("ash", None), [(248, None, "", True), (440, "charcoal and ash", "Orrin", False)])
    sc.text(24, 330, "Young · 1", 13, "fog"); sc.line(344, 341, 344, 352); sc.node(344, 352, 4)
    sc.line(344, 352, 344, 368); sc.node(344, 368, 4); sc.creature("young", 344, 436, stand("juvenile", "ash", 72, 0.92)); sc.text(344, 452, "Pip", 13, "bone", "ms")
def family_c(sc):   # no young
    centre_and_parents(sc, ("charcoal and russet", "stripes"), [(248, "russet", "Hazel", False), (440, "ash", "Orrin", False)])
    sc.text(24, 371, "No young yet.", 14, "fog")
def family_d(sc):   # several groups: a spine at x 22, two rows
    centre_and_parents(sc, ("russet and ash", "crest"), [(248, "russet", "Hazel", False), (440, "charcoal and ash", "Orrin", False)])
    sc.text(24, 330, "Young · 5", 13, "fog"); sc.line(344, 341, 344, 352); sc.node(344, 352)
    rows = [(352, [("mate", "ash", "with Bram"), ("young", "russet", "Moss"), ("young", "ash", "Wren"), ("young", "charcoal and russet", "Fig")]), (464, [("mate", "russet", "with Ash"), ("young", "russet and ash", "Dot")])]
    sc.line(22, 352, 344, 352); sc.line(22, 352, 22, 464)
    for T, cells in rows:
        n = len(cells); sc.line(22, T, 68 + (n - 1) * 92, T) if T != 352 else sc.line(68, T, 68 + (n - 1) * 92, T)
        if T != 352: sc.node(22, T, 4)
        for i, (role, base, name) in enumerate(cells):
            cx = 68 + i * 92; op = 0.75 if role == "mate" else 1.0
            sc.line(cx, T, cx, T + 16, op); sc.node(cx, T + 16, 4, op)
            if T + 84 < 560 - 0: sc.creature(role, cx, T + 84, stand("adult" if role == "mate" else "juvenile", base, ROLES[role][0], 0.92)); sc.text(cx, T + 100, name, 13, "fog" if role == "mate" else "bone", "ms")
for nm, fn in (("a", family_a), ("b", family_b), ("c", family_c), ("d", family_d)): proof(f"proof-family-{nm}-1x.png", fn)
print("ok", len(made))
