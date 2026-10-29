"""The close-up's icon sheet (ux-closeup.md section 4; the art director's sign-off ad-bay-closeup.md 2.5 and 2.6: the Coat a lock of fur leaning right,
no Skill chevron, so 12 icons), drawn by hand in code at 512 (8x of the 64 master), reduced to 64, then 32, 24 and 16 (R5), never enlarged.
Each icon is one silhouette in `bone` (#f1ebdf) with straight alpha; inner details are holes, so each reads filled black on white alone.
Also the Bay's header glyph (ux-bay.md section 6: a crate, replacing the house), drawn the same way at 320 and reduced to 20.
usage: python3 -I tools/closeupicons.py   Writes closeup/icons/ (the sizes, the sheet and the silhouette proofs) and closeup/icons/icons.json."""
import os, json, math, hashlib
import numpy as np
from PIL import Image, ImageDraw
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = f"{R}/closeup/icons"; os.makedirs(OUT, exist_ok=True)
BONE = (241, 235, 223); N = 512

def canvas(n=N): im = Image.new("L", (n, n), 0); return im, ImageDraw.Draw(im)
def bez(p, t):
    n = len(p) - 1; return tuple(sum(math.comb(n, i) * (1 - t) ** (n - i) * t ** i * p[i][k] for i in range(n + 1)) for k in range(2))
def taper(d, pts, w0, w1, fill=255, steps=220):
    """A tapered stroke along a bezier: discs from width w0 to w1."""
    for i in range(steps + 1):
        t = i / steps; x, y = bez(pts, t); r = (w0 + (w1 - w0) * t) / 2; d.ellipse([x - r, y - r, x + r, y + r], fill=fill)
def rr(d, b, r, fill=255): d.rounded_rectangle(b, r, fill=fill)
def disc(d, c, r, fill=255): d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], fill=fill)

def coat():      # a lock of fur leaning right: three tips from one base, each curling the same way (to the right); never the sprout's two leaves
    im, d = canvas()
    taper(d, [(190, 470), (150, 330), (210, 170), (330, 70)], 120, 10)      # the tall tip, curling right at the top
    taper(d, [(230, 470), (240, 340), (330, 230), (430, 200)], 110, 10)     # the middle tip
    taper(d, [(270, 470), (330, 400), (420, 380), (470, 330)], 95, 10)      # the low tip
    d.ellipse([140, 400, 330, 490], fill=255)                                # the one base they grow from
    return im
def face():      # a round head, wider than tall, two ear bumps, two eye holes
    im, d = canvas(); d.ellipse([48, 150, 464, 452], fill=255); disc(d, (138, 160), 68); disc(d, (374, 160), 68)
    disc(d, (184, 300), 40, 0); disc(d, (328, 300), 40, 0); return im
def movement():  # a paw print: one pad and three separate toe dots (the only icon of four pieces)
    im, d = canvas(); d.ellipse([126, 268, 386, 468], fill=255); disc(d, (110, 196), 58); disc(d, (256, 118), 62); disc(d, (402, 196), 58); return im
def shape():     # a side-on body: a long, low bean on two short legs
    im, d = canvas(); d.ellipse([36, 150, 476, 360], fill=255); d.ellipse([340, 110, 470, 240], fill=255)   # body, the head end raised a little
    rr(d, [120, 300, 186, 444], 26); rr(d, [318, 300, 384, 444], 26); return im
def stamp():     # a postage stamp: a square with a perforated (scalloped) edge, solid, a small emblem (a mibi's round body and ear) and one bar as holes
    im, d = canvas(); rr(d, [60, 60, 452, 452], 6)
    for k in range(0, 9):
        c = 60 + 49 * k
        for p in ((c, 60), (c, 452), (60, c), (452, c)): disc(d, p, 17, 0)
    d.ellipse([150, 130, 362, 300], fill=0); disc(d, (318, 136), 44, 0)      # the emblem
    rr(d, [150, 340, 362, 384], 12, 0); return im                           # the denomination bar
def cross():     # two interlocking rings, side by side (the only wide double outline)
    im, d = canvas(); A, B, ro, ri = (178, 256), (334, 256), 150, 104
    ring = lambda c: (d.ellipse([c[0] - ro, c[1] - ro, c[0] + ro, c[1] + ro], fill=255), d.ellipse([c[0] - ri, c[1] - ri, c[0] + ri, c[1] + ri], fill=0))
    ring(A)
    m = Image.new("L", (N, N), 0); md = ImageDraw.Draw(m); md.ellipse([B[0] - ro - 14, B[1] - ro - 14, B[0] + ro + 14, B[1] + ro + 14], fill=255); md.ellipse([B[0] - ri + 14, B[1] - ri + 14, B[0] + ri - 14, B[1] + ri - 14], fill=0)
    md.rectangle([0, 256, N, N], fill=0)                                     # B passes over A at the top crossing only: a gap cut in A there
    a = np.asarray(im).copy(); a[np.asarray(m) > 0] = 0; im = Image.fromarray(a); d = ImageDraw.Draw(im)
    d.ellipse([B[0] - ro, B[1] - ro, B[0] + ro, B[1] + ro], fill=255); d.ellipse([B[0] - ri, B[1] - ri, B[0] + ri, B[1] + ri], fill=0)
    # and A over B at the bottom crossing: A's band redrawn there, with a gap in B
    m2 = Image.new("L", (N, N), 0); md = ImageDraw.Draw(m2); md.ellipse([A[0] - ro, A[1] - ro, A[0] + ro, A[1] + ro], fill=255); md.ellipse([A[0] - ri, A[1] - ri, A[0] + ri, A[1] + ri], fill=0); md.rectangle([0, 0, N, 256], fill=0)
    g = Image.new("L", (N, N), 0); gd = ImageDraw.Draw(g); gd.ellipse([A[0] - ro - 14, A[1] - ro - 14, A[0] + ro + 14, A[1] + ro + 14], fill=255); gd.ellipse([A[0] - ri + 14, A[1] - ri + 14, A[0] + ri - 14, A[1] + ri - 14], fill=0); gd.rectangle([0, 0, N, 256], fill=0)
    a = np.asarray(im).copy(); bring = (a > 0) & (np.asarray(g) > 0) & ~(np.asarray(m2) > 0); a[bring] = 0; a[np.asarray(m2) > 0] = 255
    return Image.fromarray(a)
def portrait():  # an easel: a square canvas on three splayed legs
    im, d = canvas()
    d.line([(256, 60), (96, 486)], fill=255, width=34); d.line([(256, 60), (416, 486)], fill=255, width=34); d.line([(256, 200), (256, 486)], fill=255, width=30)
    rr(d, [120, 80, 392, 300], 8); d.rectangle([100, 300, 412, 330], fill=255)          # the canvas and the easel's ledge
    return im
def manage():    # an arched doorway with a step (the only arch)
    im, d = canvas(); d.rectangle([108, 200, 404, 432], fill=255); d.ellipse([108, 52, 404, 348], fill=255)
    d.rectangle([164, 210, 348, 432], fill=0); d.ellipse([164, 108, 348, 292], fill=0)   # the opening
    rr(d, [52, 420, 460, 474], 8); return im                                            # the step
def rename():    # a quill: one diagonal stroke with a feathered top
    im, d = canvas()
    d.polygon([(450, 50), (350, 70), (250, 140), (180, 250), (130, 360), (170, 380), (260, 300), (360, 220), (430, 140)], fill=255)   # the vane
    for k in range(5):                                                       # the feathered edge: notches on the lower side
        t = 0.2 + 0.15 * k; x, y = 170 + (430 - 170) * t, 380 + (140 - 380) * t; d.polygon([(x, y), (x + 40, y - 6), (x + 10, y - 34)], fill=0)
    d.line([(150, 360), (64, 470)], fill=255, width=30); return im          # the shaft and nib
def companion(): # the device: a tall rounded rectangle with a screen inset (and one button)
    im, d = canvas(); rr(d, [146, 40, 366, 472], 44); rr(d, [184, 90, 328, 326], 14, 0); disc(d, (256, 400), 32, 0); return im
def bonded():    # a heart
    im, d = canvas(); disc(d, (178, 196), 112); disc(d, (334, 196), 112); d.polygon([(76, 250), (436, 250), (256, 462)], fill=255); return im
def held():      # the lock: a shackle over a body with a keyhole
    im, d = canvas(); d.ellipse([136, 40, 376, 280], fill=255); d.ellipse([186, 90, 326, 230], fill=0); d.rectangle([186, 160, 326, 260], fill=0)
    rr(d, [96, 220, 416, 472], 30); disc(d, (256, 320), 34, 0); d.polygon([(236, 330), (276, 330), (290, 420), (222, 420)], fill=0); return im
def sprout():    # the sheet's sprout (two leaves on a stem), drawn here only for the side-by-side silhouette check against the Coat
    im, d = canvas(); d.line([(256, 470), (256, 230)], fill=255, width=34)
    d.polygon([(256, 250), (190, 150), (60, 130), (110, 230), (220, 270)], fill=255); d.polygon([(256, 250), (322, 150), (452, 130), (402, 230), (292, 270)], fill=255); return im
def crate(n=320):  # the Bay's header glyph: a field crate front-on, its lid apart (the only box with a lid gap)
    im, d = canvas(n); s = n / 320
    rr(d, [20 * s, 64 * s, 300 * s, 112 * s], 6 * s)                         # the lid
    rr(d, [36 * s, 124 * s, 284 * s, 292 * s], 4 * s)                        # the body
    for y in (180, 236): d.rectangle([92 * s, y * s, 228 * s, (y + 14) * s], fill=0)   # two slat gaps between the corner posts
    return im

ICONS = {"coat": coat, "face": face, "movement": movement, "shape": shape, "stamp": stamp, "cross": cross, "portrait": portrait, "manage": manage,
         "rename": rename, "companion": companion, "bonded": bonded, "held": held}
WORD = {"coat": "Coat", "face": "Face", "movement": "Movement", "shape": "Shape", "stamp": "Stamp", "cross": "Cross", "portrait": "Portrait", "manage": "Manage",
        "rename": "Rename", "companion": "on the Companion", "bonded": "bonded", "held": "the held reason"}
def reduce(mask, size):
    a = Image.fromarray(np.asarray(mask)).resize((size, size), Image.LANCZOS) if mask.width != size else mask
    return a
def rgba(mask):
    out = Image.new("RGBA", mask.size, BONE + (0,)); out.putalpha(mask); return out
rec = {}; masks = {}
def save(im, name):
    p = f"{OUT}/{name}.png"; im.save(p, optimize=True); rec[name] = {"size": list(im.size), "sha256": hashlib.sha256(open(p, "rb").read()).hexdigest()}
for k, fn in ICONS.items():
    big = fn(); m64 = big.resize((64, 64), Image.LANCZOS); masks[k] = {64: m64}
    save(rgba(m64), f"icon-{k}-64x64")
    for s in (32, 24, 16):
        m = m64.resize((s, s), Image.LANCZOS); masks[k][s] = m; save(rgba(m), f"icon-{k}-{s}x{s}")
c = crate(); c64 = c.resize((64, 64), Image.LANCZOS); c20 = c64.resize((20, 20), Image.LANCZOS)
save(rgba(c64), "glyph-bay-crate-64x64"); save(rgba(c20), "glyph-bay-crate-20x20")

# silhouette check: every pair at 16 px, intersection over union of the alpha (a high score means two icons look alike)
def iou(a, b):
    a = np.asarray(a, np.float32) / 255; b = np.asarray(b, np.float32) / 255; return float(np.minimum(a, b).sum() / max(np.maximum(a, b).sum(), 1e-6))
ks = list(ICONS); pairs = sorted(((iou(masks[a][16], masks[b][16]), a, b) for i, a in enumerate(ks) for b in ks[i + 1:]), reverse=True)
sp16 = sprout().resize((64, 64), Image.LANCZOS).resize((16, 16), Image.LANCZOS); sp24 = sprout().resize((64, 64), Image.LANCZOS).resize((24, 24), Image.LANCZOS)
check = {"pairs_16_iou_top5": [[round(v, 3), a, b] for v, a, b in pairs[:5]], "coat_vs_sprout_16": round(iou(masks["coat"][16], sp16), 3), "coat_vs_sprout_24": round(iou(masks["coat"][24], sp24), 3)}

# the sheet at 1x: each icon at 64, 32, 24, 16 in bone on slate, with its word; and the silhouette proof: filled black on white, each alone
from PIL import ImageFont
F = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Medium.otf", 13)
sheet = Image.new("RGBA", (12 * 84 + 16, 200), (42, 46, 56, 255)); d = ImageDraw.Draw(sheet)
sil = Image.new("RGBA", (12 * 84 + 16 + 120, 200), (255, 255, 255, 255)); ds = ImageDraw.Draw(sil)
for i, k in enumerate(ks):
    x = 16 + 84 * i
    sheet.alpha_composite(rgba(masks[k][64]), (x, 12)); y = 84
    for s in (32, 24, 16): sheet.alpha_composite(rgba(masks[k][s]), (x, y)); y += s + 6
    d.text((x, 182), WORD[k][:11], font=F, fill=(198, 196, 216))
    for s, yy in ((64, 12), (32, 84), (24, 122), (16, 152)):
        blk = Image.new("RGBA", (s, s), (0, 0, 0, 255)); blk.putalpha(masks[k][s]); sil.alpha_composite(blk, (x, yy))
    ds.text((x, 182), k, font=F, fill=(0, 0, 0))
x = 16 + 84 * 12
for s, yy, m in ((24, 84, sp24), (16, 122, sp16)):
    blk = Image.new("RGBA", (s, s), (0, 0, 0, 255)); blk.putalpha(masks["coat"][s]); sil.alpha_composite(blk, (x, yy))
    blk = Image.new("RGBA", (s, s), (0, 0, 0, 255)); blk.putalpha(m); sil.alpha_composite(blk, (x + 40, yy))
ds.text((x, 152), "coat | sprout", font=F, fill=(0, 0, 0))
blk = Image.new("RGBA", (20, 20), (0, 0, 0, 255)); blk.putalpha(c20); sil.alpha_composite(blk, (x, 20))
ds.text((x + 26, 22), "bay 20", font=F, fill=(0, 0, 0))
sheet.convert("RGB").save(f"{OUT}/proof-icon-sheet-1x.png"); sil.convert("RGB").save(f"{OUT}/proof-icon-silhouettes-1x.png")
sil.convert("RGB").resize((sil.width * 3, sil.height * 3), Image.NEAREST).save(f"{OUT}/proof-icon-silhouettes-3x.png")
json.dump({"icons": rec, "check": check, "colour": "bone #f1ebdf, straight alpha"}, open(f"{OUT}/icons.json", "w"), indent=1); print(json.dumps(check))
