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
def erode(m):
    p = np.pad(m, 1, constant_values=False); return m & p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:]
def seed_mask(w, h, S=8):
    """An almond pointed at both ends, tilted about 30 degrees from the vertical (top toward the upper right), with a small stem nub at its upper end; returns (body mask, nub mask)."""
    ys = (np.arange(h * S) + 0.5) / S - h / 2; xs = (np.arange(w * S) + 0.5) / S - w / 2; X, Y = np.meshgrid(xs, ys)
    th = np.radians(30.0); u = X * np.cos(th) - Y * np.sin(th); v = X * np.sin(th) + Y * np.cos(th)        # v along the seed's axis (down), u across
    Wd = w * 0.30; cs, sn = np.cos(th), np.sin(th)                                                       # half width of the almond
    L = ((h / 2 - 3.0 - 3.2 * cs) - Wd * sn * 0.6) / cs                                                    # the longest half length that keeps the nub and the keyline inside the slice
    L = min(L, (w / 2 - 1.5 - Wd * cs * 0.6) / sn); inside_ax = np.abs(v) <= L
    prof = Wd * np.clip(1 - (np.abs(v) / max(L, 1e-6)) ** 2.0, 0, 1) ** 0.58                                  # pointed at both ends, fullest at the middle
    body = inside_ax & (np.abs(u) <= prof)
    bend = 0.12 * np.clip(-L - v, 0, None) ** 2                                                              # a curved stub: the stem bends away as it leaves the tip
    nub = (np.abs(u - bend) <= 1.15) & (v < -L + 0.4) & (v >= -L - 3.4)                                       # the stem nub at the upper end, about 2.3 px wide, 3 px long
    red = lambda m: m.reshape(h, S, w, S).mean((1, 3)) >= 0.5
    return red(body), red(nub)
def seed(w, h):
    m, nub = seed_mask(w, h); inner = erode(erode(m))
    p_ = np.pad(nub, 1, constant_values=False); ring = (p_[:-2, 1:-1] | p_[2:, 1:-1] | p_[1:-1, :-2] | p_[1:-1, 2:]) & ~nub & ~m     # the nub's own 1 px keyline
    key = (m & ~erode(m)) | ring; nub = nub & ~(m & ~erode(m))
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); em = erode(m)
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    sheen = np.exp(-(((xx - w * 0.38) ** 2 + (yy - h * 0.34) ** 2) / (2 * (w * 0.22) ** 2)))             # a soft top-left sheen
    for y in range(h):
        for x in range(w):
            if key[y, x]: im.putpixel((x, y), INK + (255,))
            elif nub[y, x]: im.putpixel((x, y), BONE + (255,))
            elif m[y, x] and not inner[y, x]: im.putpixel((x, y), (WHITE if (not em[y - 1, x] or not em[y, x - 1]) and (x + y) < (w + h) / 2 else BONE) + (255,))
            elif inner[y, x]:
                a = int(round(255 * (0.35 + 0.14 * sheen[y, x]))); im.putpixel((x, y), (PAL["frostS"] if sheen[y, x] < 0.5 else PAL["frost"]) + (a,))      # frostS at 0.45, no noise, a soft sheen toward the top left
    # one 1 px seam line in fog along the almond's long axis (the husk's seam)
    th = np.radians(30.0); X = xx + 0.5 - w / 2; Y = yy + 0.5 - h / 2; uu = X * np.cos(th) - Y * np.sin(th)
    for y in range(h):
        for x in range(w):
            if inner[y, x] and abs(uu[y, x]) < 0.5: im.putpixel((x, y), PAL["fog"] + (255,))
    mk = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for y in range(h):
        for x in range(w):
            if inner[y, x]: mk.putpixel((x, y), (255, 255, 255, 255))
    return im, mk
for (w, h) in ((40, 52), (32, 40)):
    im, mk = seed(w, h)
    save(f"mark-seed-{w}x{h}", im, [None, None, w, h], f"the misty seed ({w}x{h}): an almond with a pointed tip, no cap or ribs; a bone wall with a 1 px ink keyline, a white lit edge upper left, a frosted-glass interior (frostS veil with a frostD stipple); at P.x + P.w - {48 if w == 40 else 40}, P.y + P.h - {60 if w == 40 else 48}", "geometry")
    save(f"mark-seed-{w}x{h}-mask", mk, [None, None, w, h], f"the matching mask of the {w}x{h} seed: its interior silhouette, opaque white, for the build to clip the hidden look's small picture into, under the frost", "geometry")
# the 'only' mark 72x8: a 2 px engraved line with small end ticks, in fog with the ink keyline (above and below), quiet, inside the frame's lower lip
img = Image.new("RGBA", (72, 8), (0, 0, 0, 0)); FOG = PAL["fog"]
for x in range(6, 66):
    img.putpixel((x, 3), FOG + (255,)); img.putpixel((x, 4), FOG + (255,)); img.putpixel((x, 2), INK + (255,)); img.putpixel((x, 5), INK + (255,))
for x in (5, 66):
    for y in (1, 2, 3, 4, 5, 6): img.putpixel((x, y), FOG + (255,)) if y in (2, 3, 4, 5) else img.putpixel((x, y), INK + (255,))
    for y in (2, 3, 4, 5): img.putpixel((x - 1 if x == 5 else x + 1, y), INK + (255,))
save("mark-only-72x8", img, [None, None, 72, 8], "the 'only' mark, quieter: a 2 px engraved line with small end ticks in fog with a 1 px ink keyline, 72 x 8, set inside the frame's lower lip (centred on the picture's bottom edge)", "typed by hand")
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

# ---- pass 47: compare-mark-differs-12x12, typed pixel by pixel (no generator): a "not the same" sign, two short strokes, the lower shifted right; aqua with a 1 px ink keyline
rows = ["............",     # row 0 empty; the sign occupies rows 1 to 10 (10 rows, centred in 12: one empty row above and one below)
        "iiiiiiiii...",    # row 1: the upper stroke's keyline, x 0 to 8
        "immmmmmmi...",    # row 2: mint lit top row, 7 px inside the keyline (x 1 to 7)
        "iaaaaaaai...",    # row 3: aqua, 7 px
        "iiiiiiiii...",    # row 4
        "............",    # row 5: the gap
        "............",    # row 6
        "...iiiiiiiii",    # row 7: the lower stroke's keyline, x 3 to 11
        "...immmmmmmi",    # row 8
        "...iaaaaaaai",    # row 9
        "...iiiiiiiii",    # row 10
        "............"]
assert len(rows) == 12 and all(len(r) == 12 for r in rows)
cmk = Image.new("RGBA", (12, 12), (0, 0, 0, 0)); pc = {"i": INK, "a": PAL["aqua"], "m": PAL["mint"]}
for y, r in enumerate(rows):
    for x, ch in enumerate(r):
        if ch in pc: cmk.putpixel((x, y), pc[ch] + (255,))
cmk.save("slices/compare-mark-differs-12x12.png", optimize=True)
man = json.load(open("slices/manifest.json"))
man["compare-mark-differs-12x12"] = {"size": [12, 12], "rect": None, "src": "typed by hand", "made": "Compare's 'differs' mark: a 'not the same' sign of two short strokes of 7 px (inside a 9 px keyline), the lower shifted 3 px right, aqua with a mint lit top row and a 1 px ink keyline; typed pixel by pixel, centred vertically (rows 1 to 10 of 12); placed 1:1 after a trait's name on the name line", "sha256": hashlib.sha256(open("slices/compare-mark-differs-12x12.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1)
pane = Image.open("slices/page-pane-256x440.png").convert("RGBA").crop((100, 100, 160, 130)); sh = Image.new("RGBA", (200, 40), (0, 0, 0, 255)); sh.alpha_composite(pane.resize((60, 30)), (0, 5))
from PIL import ImageFont
f16 = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Regular.otf", 16); d_ = ImageDraw.Draw(sh); sh.paste(Image.new("RGBA", (200, 40), (21, 36, 46, 255)), (0, 0)); d_.text((8, 20), "Markings", font=f16, fill=BONE + (255,), anchor="lm")
sh.alpha_composite(cmk, (8 + int(d_.textlength("Markings", font=f16)) + 4, 14)); sh.convert("RGB").save("marks/compare-mark-1x.png"); sh.resize((800, 160), Image.NEAREST).convert("RGB").save("marks/compare-mark-4x-proof.png")
bg = Image.new("RGBA", (12, 12), (21, 36, 46, 255)); bg.alpha_composite(cmk); bg.resize((240, 240), Image.NEAREST).convert("RGB").save("marks/compare-mark-alone-20x-proof.png"); bg.resize((48, 48), Image.NEAREST).convert("RGB").save("marks/compare-mark-alone-4x.png")
