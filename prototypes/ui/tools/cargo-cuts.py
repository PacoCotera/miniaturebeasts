#!/usr/bin/env python3
"""Cargo's cut masters (build-spec section 5, "To cut"): made from placed masters and the art director's finish constructions
(results/T-20261016-197/finish/make-cargo-finish.py: bay_base, bay_light, berth, the lit well, the dimming). Nothing is painted.

  python3 -I prototypes/ui/tools/cargo-cuts.py --out DIR [--masters prototypes/ui/assets/masters/pods] [--check]

Writes DIR/slices/<id>.png and DIR/slices/manifest.json (size, SHA-256) in the shape place-masters.mjs reads, so
  node prototypes/ui/tools/place-masters.mjs --from DIR --ids <the ids> --by "<who>"
places them. Deterministic: the same masters give the same bytes. --check also proves the two crops that masters-pods already holds
(hatch-shut-160x260, berth-shut-256x292) are what the rule gives, byte for byte, and that the 176 px crate masters are the reductions of the 256 ones (--cleaned DIR: of the art director's cleaned lifting 256).
"""
import argparse, hashlib, json, os, sys
import numpy as np
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser(); ap.add_argument("--out", required=True)
ap.add_argument("--masters", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "masters", "pods"))
ap.add_argument("--check", action="store_true")
ap.add_argument("--cleaned", help="the art director's cleaned cuts (results/T-20261016-197/finish/cuts): --check proves the placed crate-lifting-256x200, crate-lifting-176x138 and pods-hatch-open-160x260 are those files, byte for byte, and the 176 is the reduction of the cleaned 256")
args = ap.parse_args()
M = args.masters

def master(n): return Image.open(os.path.join(M, n + ".png")).convert("RGBA")
def place(im, src, xy): im.alpha_composite(src, (int(xy[0]), int(xy[1])))          # 1:1, never scaled
def dim(src, k):                                                                     # value only: the hue is kept
    s = np.asarray(src).astype(np.float32); s[..., :3] *= k; return Image.fromarray(s.clip(0, 255).astype(np.uint8), "RGBA")
def rrect_mask(w, h, r):
    m = Image.new("L", (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), r, fill=255); return m
def soft_glow(c, cx, cy, rx, ry, color, peak=0.5, power=2.0):                        # a smooth light pool: alpha = peak * (1 - d)^power inside the ellipse
    w, h = c.size; yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2); a = np.clip(1 - d, 0, 1) ** power * peak
    g = np.zeros((h, w, 4), np.uint8); g[..., :3] = color; g[..., 3] = (a * 255).astype(np.uint8)
    c.alpha_composite(Image.fromarray(g, "RGBA"))

BW, BH = 992, 506            # the bay window (screen 16, 46)
MINT = (173, 246, 224)       # the house mint (frame.json colours)

def bay_base():
    c = Image.new("RGBA", (BW, BH), (0, 0, 0, 255)); bay = master("cargo-bay-992x320"); place(c, bay, (0, 0))
    floor = np.asarray(bay)[296:316].mean(axis=(0, 1))[:3]
    d = ImageDraw.Draw(c); d.rectangle((0, 320, BW, BH), fill=tuple(int(v * 0.86) for v in floor))
    d.line((0, 320, BW, 320), fill=tuple(int(min(255, v * 1.12)) for v in floor))
    return c
def bay_light(c): soft_glow(c, 300, 20, 520, 200, (255, 226, 180), 0.10, 1.6)         # the bay's one light, from the top left, over the back wall

def berth(c, x, y, w, h):    # a recess in the bay wall (no crate): the back wall shaded under the lip, the floor catching the light, a dark inner edge
    d = ImageDraw.Draw(c); fl = 44
    g = np.linspace(0, 1, h - fl)[:, None, None]; back = np.array([46, 40, 35]) * (1 - g) + np.array([84, 74, 64]) * g
    floor = np.linspace(0, 1, fl)[:, None, None]; fcol = np.array([112, 100, 86]) * (1 - floor) + np.array([92, 82, 71]) * floor
    col = np.concatenate([np.broadcast_to(back, (h - fl, w, 3)), np.broadcast_to(fcol, (fl, w, 3))])
    xs = np.linspace(0, 1, w)[None, :, None]; col = col * (1.06 - 0.12 * xs)
    yy = np.arange(h)[:, None, None]; col = col * (1 - 0.45 * np.clip(1 - yy / 22, 0, 1) ** 2)
    rec = Image.fromarray(np.dstack([col.clip(0, 255), np.full((h, w, 1), 255)]).astype(np.uint8), "RGBA"); c.paste(rec, (x, y), rrect_mask(w, h, 6))
    d.line((x + 4, y + h - fl, x + w - 5, y + h - fl), fill=(70, 62, 54))
    d.line((x + 6, y + 1, x + w - 7, y + 1), fill=(30, 27, 24)); d.line((x + 1, y + 6, x + 1, y + h - 7), fill=(40, 36, 32))

def recess(w, h):            # the berth's own pixels, the rounded corners clear; the bay's sage rim (1 px outside the rect) belongs to the bay, not to the cut
    c = bay_base(); bay_light(c); berth(c, 200 - 16, 252 - 46, w, h)
    r = c.crop((200 - 16, 252 - 46, 200 - 16 + w, 252 - 46 + h)); r.putalpha(rrect_mask(w, h, 6)); return r

def lit_well():              # the mint ring (2 px, radius 25) and its pool (radius 31: it reaches 0 inside the box, art director 22:21), in a 64 x 64 box centred on the well
    c = Image.new("RGBA", (64, 64), (0, 0, 0, 0)); soft_glow(c, 32, 32, 31, 31, MINT, 0.4, 1.5)
    ImageDraw.Draw(c).ellipse((32 - 25, 32 - 25, 32 + 25, 32 + 25), outline=MINT + (255,), width=2); return c

SAGE, LIP, GOLD, KEY = (118, 136, 112, 255), (136, 150, 128, 255), (216, 155, 20, 255), (90, 64, 12, 255)   # the art director's: the berth's outline and lip, the palette's gold, the gilt edge's keyline (finish/make-portrait-in.py)
def edge(w, h):              # a berth's own outline and lip, which the build draws (art director, 22:21): a 1 px rounded outline at the rect - 1, radius 7, sage, and a 1 px lip along the bottom, inset 6; the interior is clear
    c = Image.new("RGBA", (w + 2, h + 2), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
    d.rounded_rectangle((0, 0, w + 1, h + 1), 7, outline=SAGE); d.line((7, h - 1, w, h - 1), fill=LIP); return c
def gilt(w, h):              # the fourth berth's gold edge: 2 px gold, rounded, from (x - 3, y - 3) to (x + w + 2, y + h + 2), radius 9, and a 1 px keyline outside it, radius 10 (the picture's origin is (x - 5, y - 5))
    c = Image.new("RGBA", (w + 10, h + 10), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
    d.rounded_rectangle((2, 2, w + 7, h + 7), 9, outline=GOLD, width=2); d.rounded_rectangle((0, 0, w + 9, h + 9), 10, outline=KEY); return c
def mat():                   # the waiting mat (build-spec 1): radius 8, fill #383e36, a 1 px outline #546052, a 1 px top line #282c26 from x + 8 to x + w - 9, one row inside the outline (finish/make-cargo-finish.py waiting())
    c = Image.new("RGBA", (160, 80), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
    d.rounded_rectangle((0, 0, 159, 79), 8, fill=(56, 62, 54, 255), outline=(84, 96, 82, 255)); d.line((8, 1, 160 - 9, 1), fill=(40, 44, 38, 255)); return c

shut = master("cargo-bay-shut-976x304")
cuts = {
    "cargo-bay-992x506": (lambda: (lambda c: (bay_light(c), c)[1])(bay_base())),
    "berth-recess-256x292": lambda: recess(256, 292),
    "berth-recess-188x292": lambda: recess(188, 292),
    "berth-shut-188x292": lambda: shut.crop((360, 6, 360 + 188, 6 + 292)),           # the same slatted door and origin as berth-shut-256x292
    "berth-edge-258x294": lambda: edge(256, 292),
    "berth-edge-190x294": lambda: edge(188, 292),
    "berth-gilt-198x302": lambda: gilt(188, 292),
    "cargo-mat-160x80": mat,
    "well-lit-64x64": lit_well,
    "crate-sealed-256x176-done": lambda: dim(master("crate-sealed-256x176"), 0.72),
    "crate-sealed-176x121-done": lambda: dim(master("crate-sealed-176x121"), 0.72),
    "crate-sitting-176x121-done": lambda: dim(master("crate-sitting-176x121"), 0.72),
}
slices = os.path.join(args.out, "slices"); os.makedirs(slices, exist_ok=True); manifest = {}
for name, make in cuts.items():
    im = make(); p = os.path.join(slices, name + ".png"); im.save(p, optimize=False)
    manifest[name] = {"size": list(im.size), "rect": None, "sha256": hashlib.sha256(open(p, "rb").read()).hexdigest()}
json.dump(manifest, open(os.path.join(slices, "manifest.json"), "w"), indent=1)
for n, m in manifest.items(): print(n, m["size"], m["sha256"][:12])

if args.check:
    def same(a, b): return a.size == b.size and (np.asarray(a) == np.asarray(b)).all()
    ok = True
    for n, box in (("hatch-shut-160x260", (40, 20, 200, 280)), ("berth-shut-256x292", (360, 6, 616, 298))):
        s = same(master(n), shut.crop(box)); ok &= s; print("check", n, "is the crop of cargo-bay-shut-976x304 at", box[:2], s)
    for n, src in (("crate-sealed-176x121", "crate-sealed-256x176"), ("crate-sitting-176x121", "crate-sitting-256x176"), ("crate-lifting-176x138", "crate-lifting-256x200")):
        s0 = master(src); r = s0.resize((176, round(s0.height * 176 / s0.width)), Image.LANCZOS); s = same(master(n), r); ok &= s; print("check", n, "is the 176 px reduction of", src, s)
    if args.cleaned:
        def raw(n): return Image.open(os.path.join(args.cleaned, n + ".png")).convert("RGBA")
        for n in ("crate-lifting-256x200", "crate-lifting-176x138", "pods-hatch-open-160x260"):
            s = open(os.path.join(args.cleaned, n + ".png"), "rb").read() == open(os.path.join(M, n + ".png"), "rb").read(); ok &= s; print("check", n, "is the art director's cleaned cut, byte for byte", s)
        c256 = raw("crate-lifting-256x200"); s = same(raw("crate-lifting-176x138"), c256.resize((176, round(c256.height * 176 / c256.width)), Image.LANCZOS)); ok &= s; print("check the cleaned crate-lifting-176x138 is the 176 px reduction of the cleaned 256", s)
    sh = master("crate-shadow-256x24"); s = same(master("crate-shadow-176x16"), sh.resize((176, round(sh.height * 176 / sh.width)), Image.LANCZOS)); ok &= s; print("check crate-shadow-176x16 is the reduction of crate-shadow-256x24", s)
    sys.exit(0 if ok else 1)
