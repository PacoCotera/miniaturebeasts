"""Trait kind marks (Brief 1; design-station-frame eb4de19c, "Marks on a picture"): emblem manner on the art layer, bone with a 1 px ink keyline, the lit edge upper left one step lighter (white),
one state each, never on unread cells. python3 -I tools/kindmarks.py
- mark-seed-40x52 / mark-seed-32x40 (pictures under 120 tall): an almond seed with a pointed tip, no cap or ribs, a frosted-glass interior (frostS at a low alpha with a frostD stipple); and a matching
  -mask slice each: the interior silhouette, opaque white, for the build to clip the hidden look's small picture into under the frost. The blend is the same seed placed bottom left and bottom right.
- mark-only-72x8: a low engraved plinth centred on the picture's bottom edge, a lit top edge.
- mark-asleep-24x16: a slim crescent with a short dotted arc beneath, no Z's, no face.
- mark-breed-28x16: two joined rings, slightly offset, as engraved lines in bone (1 px bone, ink keyline either side), no gold.
Pixels are set by geometry (the seed's and the rings' outlines, the crescent) and typed rows (the plinth, the dots), hard-edged: no anti-aliasing."""
import json, os, hashlib
import numpy as np
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT); REPO = os.path.abspath(os.path.join(ROOT, "..", "..", ".."))
PAL = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.load(open(os.path.join(REPO, "prototypes/ui/palettes/station.json")))["colours"]}
INK, BONE, WHITE = PAL["ink"], PAL["bone"], PAL["white"]
man = json.load(open("slices/manifest.json"))
def save(name, im, rect, made, src):
    im = im.convert("RGBA"); im.save(f"slices/{name}.png", optimize=True)
    man[name] = {"size": list(im.size), "rect": rect, "src": src, "made": made, "sha256": hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest()}
def seed_mask(w, h, S=8):
    """The almond: pointed at the top, widest a little below the middle, rounded at the foot; a crisp mask of the outline (at S x then thresholded) with a 1 px margin for the keyline."""
    ys = (np.arange(h * S) + 0.5) / S; xs = (np.arange(w * S) + 0.5) / S; X, Y = np.meshgrid(xs, ys)
    t = np.clip((Y - 1.0) / (h - 2.0), 0, 1); wmax = (w - 2.0) / 2
    half = np.where(t < 0.58, wmax * np.clip(1 - np.clip((0.58 - t) / 0.58, 0, 1) ** 1.6, 0, 1) ** 0.85, wmax * np.sqrt(np.clip(1 - ((t - 0.58) / 0.42) ** 2, 0, 1)))      # an ogive tip (convex, an almond's) over a round foot
    inside = (np.abs(X - w / 2) <= half) & (Y >= 1.0) & (Y <= h - 1.0)
    return inside.reshape(h, S, w, S).mean((1, 3)) >= 0.5
def erode(m):
    p = np.pad(m, 1, constant_values=False); return m & p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:]
def seed(w, h):
    m = seed_mask(w, h); inner = erode(erode(erode(m)))                       # a 2 px bone wall inside the 1 px ink keyline
    key = m & ~erode(m); wall = m & ~key & ~inner
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); rng = np.random.RandomState(11)
    for y in range(h):
        for x in range(w):
            if key[y, x]: im.putpixel((x, y), INK + (255,))
            elif wall[y, x]:
                lit = (not m[y, x - 1] or not m[y - 1, x] or not erode(m)[y, x - 1] or not erode(m)[y - 1, x]) if (x > 0 and y > 0) else True
                lit = lit or not erode(m)[y - 1, x] or not erode(m)[y, x - 1]
                im.putpixel((x, y), (WHITE if lit else BONE) + (255,))
            elif inner[y, x]: im.putpixel((x, y), (PAL["frostD"] + (100,)) if rng.rand() < 0.22 else (PAL["frostS"] + (84,)))
    mk = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for y in range(h):
        for x in range(w):
            if inner[y, x]: mk.putpixel((x, y), (255, 255, 255, 255))
    return im, mk
for (w, h) in ((40, 52), (32, 40)):
    im, mk = seed(w, h)
    save(f"mark-seed-{w}x{h}", im, [None, None, w, h], f"the misty seed ({w}x{h}): an almond with a pointed tip, no cap or ribs; a bone wall with a 1 px ink keyline, a white lit edge upper left, a frosted-glass interior (frostS veil with a frostD stipple); at P.x + P.w - {48 if w == 40 else 40}, P.y + P.h - {60 if w == 40 else 48}", "geometry")
    save(f"mark-seed-{w}x{h}-mask", mk, [None, None, w, h], f"the matching mask of the {w}x{h} seed: its interior silhouette, opaque white, for the build to clip the hidden look's small picture into, under the frost", "geometry")
# the plinth 72x8: typed rows ('i' ink, 'b' bone, 'w' white lit, 'g' a groove in ink: the engraving)
rows = ["..iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii..".replace("i", "i"), "", "", "", "", "", "", ""]
W = 72; pl = [["."] * W for _ in range(8)]
for y in range(8):
    inset = max(0, 3 - y // 1 // 1) if y < 3 else 0                                                           # a slight slope at the shoulders
    x0 = inset; x1 = W - 1 - inset
    for x in range(x0, x1 + 1):
        if y == 0: pl[y][x] = "i"
        elif y == 1: pl[y][x] = "w"                                                                           # the lit top edge
        elif y == 7: pl[y][x] = "i"
        elif y == 5: pl[y][x] = "g" if 6 <= x <= W - 7 else "b"                                              # an engraved line along the face
        else: pl[y][x] = "b"
    if y in (1, 2, 3, 4, 5, 6): pl[y][x0] = "i"; pl[y][x1] = "i"
img = Image.new("RGBA", (W, 8), (0, 0, 0, 0)); col = {"i": INK, "b": BONE, "w": WHITE, "g": PAL["slate"]}
for y in range(8):
    for x in range(W):
        if pl[y][x] in col: img.putpixel((x, y), col[pl[y][x]] + (255,))
save("mark-only-72x8", img, [None, None, 72, 8], "the 'only' plinth: a low engraved base 72 x 8, bone with a 1 px ink keyline, a white lit top edge, an engraved line along its face; centred on the picture's bottom edge", "typed by hand")
# the crescent 24x16 with a short dotted arc beneath
cres = Image.new("RGBA", (24, 16), (0, 0, 0, 0)); S = 8
ys = (np.arange(16 * S) + 0.5) / S; xs = (np.arange(24 * S) + 0.5) / S; X, Y = np.meshgrid(xs, ys)
big = np.hypot(X - 11.5, Y - 6.0) <= 5.6; cut = np.hypot(X - 14.2, Y - 4.6) <= 4.6; cm = (big & ~cut).reshape(16, S, 24, S).mean((1, 3)) >= 0.5
key = cm & ~erode(cm); body = erode(cm)
for y in range(16):
    for x in range(24):
        if key[y, x]: cres.putpixel((x, y), INK + (255,))
        elif body[y, x]: cres.putpixel((x, y), (WHITE if (not erode(cm)[y - 1, x] or not erode(cm)[y, x - 1]) else BONE) + (255,))
for (x, y) in ((6, 13), (9, 14), (13, 14), (17, 13)):                                                       # the dotted arc beneath: four 1 px dots, bone, ink beneath-right
    cres.putpixel((x, y), BONE + (255,))
    if y + 1 < 16: cres.putpixel((x, y + 1), INK + (255,))
save("mark-asleep-24x16", cres, [None, None, 24, 16], "the asleep mark: a slim crescent (bone, a white lit edge upper left, a 1 px ink keyline) with a short dotted arc of four dots beneath; no Z's, no face; at P.x + P.w - 32, P.y + 8", "geometry and typed dots")
# two joined rings 28x16: engraved lines
br = Image.new("RGBA", (28, 16), (0, 0, 0, 0)); S = 8
ys = (np.arange(16 * S) + 0.5) / S; xs = (np.arange(28 * S) + 0.5) / S; X, Y = np.meshgrid(xs, ys)
def ring(cx, cy, r, lw=0.55): d = np.abs(np.hypot(X - cx, Y - cy) - r); return d <= lw
line = ring(9.2, 7.4, 5.9) | ring(18.8, 8.6, 5.9); lm = line.reshape(16, S, 28, S).mean((1, 3)) >= 0.45
p = np.pad(lm, 1, constant_values=False); near = (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:] | p[:-2, :-2] | p[2:, 2:] | p[:-2, 2:] | p[2:, :-2]) & ~lm
for y in range(16):
    for x in range(28):
        if lm[y, x]: br.putpixel((x, y), (WHITE if ((x - (9.2 if x < 14 else 18.8)) + (y - (7.4 if x < 14 else 8.6)) < -2.2) else BONE) + (255,))
        elif near[y, x]: br.putpixel((x, y), INK + (255,))
save("mark-breed-28x16", br, [None, None, 28, 16], "the breed-to-change mark: two joined rings, slightly offset, as engraved lines in bone (white on the upper-left arc) with a 1 px ink keyline; no gold; at P.x + 8, P.y + 8", "geometry")
json.dump(man, open("slices/manifest.json", "w"), indent=1)
# ---- the round 1 sheet: over a light and a dark picture
def light(w, h):
    side = Image.open(os.path.join(REPO, "prototypes/workbench/grow/out/S09/3982a7117cfa0fc3/station-side-600x620.png")).convert("RGB")
    bw, bh = (300, 300 * h / w); return side.crop((0, 120, 300, int(120 + bh))).resize((w, h), Image.LANCZOS).convert("RGBA")
def dark(w, h):
    f = Image.open("source/raw/mibi-face.jpg").convert("RGB"); bw = 1200; bh = bw * h / w
    return f.crop((300, 500, 300 + bw, int(500 + bh))).resize((w, h), Image.LANCZOS).convert("RGBA")
def put(base, name, x, y): base.alpha_composite(Image.open(f"slices/{name}.png").convert("RGBA"), (x, y))
def hidden(base, mk, small, x, y):                                                                         # the hidden look's small picture clipped into the seed's mask, under the frost
    pic = small.resize(mk.size, Image.LANCZOS); cl = Image.new("RGBA", mk.size, (0, 0, 0, 0)); cl.paste(pic, (0, 0), mk.split()[3]); base.alpha_composite(cl, (x, y))
SW, SH = 40 + 12, 0
cells = []
sheet = Image.new("RGBA", (4 * 144 + 16, 2 * 184 + 24 + 120), (16, 26, 36, 255))
def card(kind, w, h, marks):
    p = (light if kind == "light" else dark)(w, h)
    for m in marks: m(p)
    return p
def seed_marks(w, h, hid=True):
    sw, sh = (40, 52) if h >= 120 else (32, 40); nm = f"mark-seed-{sw}x{sh}"; x, y = w - (sw + 8), h - (sh + 8)
    def f(p):
        if hid: hidden(p, Image.open(f"slices/{nm}-mask.png").convert("RGBA"), Image.open("source/raw/mibi-face.jpg").convert("RGBA").crop((500, 300, 1500, 1300)), x, y)
        put(p, nm, x, y)
    return f
cx = 8; cy = 8
for k, (kind, w, h) in enumerate((("light", 128, 160), ("dark", 128, 160), ("light", 104, 96), ("dark", 104, 96))):
    p = card(kind, w, h, [lambda q: put(q, "mark-breed-28x16", 8, 8), lambda q, w=w: put(q, "mark-asleep-24x16", w - 32, 8), seed_marks(w, h)])
    sheet.alpha_composite(p, (8 + k * 144, 8))
for k, (kind, w, h) in enumerate((("light", 128, 160), ("dark", 128, 160))):                              # only
    p = card(kind, w, h, [lambda q, w=w, h=h: put(q, "mark-only-72x8", (w - 72) // 2, h - 8)]); sheet.alpha_composite(p, (8 + k * 144, 8 + 184))
for k, (kind, w, h) in enumerate((("dark", 128, 160), ("light", 104, 96))):                               # blend: the same seed at bottom left and bottom right
    def bl(q, w=w, h=h):
        sw, sh = (40, 52) if h >= 120 else (32, 40); nm = f"mark-seed-{sw}x{sh}"
        for xx in (8, w - (sw + 8)): put(q, nm, xx, h - (sh + 8))
    p = card(kind, w, h, [bl]); sheet.alpha_composite(p, (8 + (2 + k) * 144, 8 + 184))
p = card("dark", 104, 64, [lambda q: put(q, "mark-seed-32x40", 104 - 40, 64 - 48)]); sheet.alpha_composite(p, (8, 8 + 2 * 184 + 8))
os.makedirs("marks", exist_ok=True); sheet.convert("RGB").save("marks/kindmarks-round1-1x.png"); sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST).convert("RGB").save("marks/kindmarks-round1-2x-proof.png")
