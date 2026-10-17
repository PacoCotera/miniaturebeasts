#!/usr/bin/env python3
"""T-20261016-190: S01 Loika stands as layers, so each mibi looks like itself (art director's proposal, a proof).
The accepted Pip stand (rich-plain-300x310) is the base; each S01 locus a stand can show is a layer over it:
  Markings: plain | pale patches   (the accepted marked/plain pair: the patch layer is their difference)
  Crown:    leaf crest | bare head (the crest layer removed and the head closed)
  Eyes:     thin rings | between | wide pale rings (the pale ring narrowed or widened)
Composited from accepted art; the crown and ring edits are a proof of the layer split, to be painted as layers.

  python3 make-stands.py SRC FONTS OUT
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC, FONTS, OUT = sys.argv[1:4]
F = lambda w, s: ImageFont.truetype(os.path.join(FONTS, 'Inter-%s.ttf' % w), s)
F16, F13, F20 = F('Regular', 16), F('Regular', 13), F('Medium', 20)
src = lambda n: Image.open(os.path.join(SRC, n)).convert('RGBA')
PLAIN, MARKED = src('rich-plain-300x310.png'), src('rich-marked-300x310.png')
P = np.asarray(PLAIN, dtype=float)
M = np.asarray(MARKED, dtype=float)
H, W = P.shape[:2]


def leaf_mask(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (g >= r - 6) & (g > b + 25) & (b < r * 0.8) & (a[..., 3] > 20)


def patch_mask():
    d = np.abs(M[..., :3] - P[..., :3]).max(axis=2) > 40
    return np.asarray(Image.fromarray((d * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.8)), dtype=float) / 255


def eye_boxes(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    iris = (r > 170) & (g > 70) & (g < 160) & (b < 90) & (a[..., 3] > 200)
    ys, xs = np.nonzero(iris)
    sx = np.sort(np.unique(xs)); gaps = np.diff(sx)
    mid = sx[np.argmax(gaps)] + gaps.max() / 2
    boxes = []
    for sel in (xs < mid, xs >= mid):
        x, y = xs[sel], ys[sel]
        cx, cy, rr = x.mean(), y.mean(), max(x.max() - x.min(), y.max() - y.min()) / 2
        boxes.append((cx, cy, rr))
    return boxes


def crown_bare(a):
    """Remove the crest; close the head where the crest covered it with the fur just below, lit from the top left."""
    a = a.copy()
    lm = leaf_mask(a)
    lm = np.asarray(Image.fromarray((lm * 255).astype('uint8')).filter(ImageFilter.MaxFilter(3)), dtype=float) > 0
    opaque = (a[..., 3] > 128) & ~lm
    out = a.copy()
    out[lm, 3] = 0
    for x in range(W):
        col = np.nonzero(lm[:, x])[0]
        if not len(col):
            continue
        below = np.nonzero(opaque[:, x])[0]
        below = below[below > col.min()]
        if not len(below):
            continue
        y0 = below.min()
        rows = np.nonzero(opaque.any(axis=1) if False else opaque[:, max(0, x - 1):x + 2].any(axis=1))[0]
        # the head's top edge here: keep the leaf pixels that sit inside the head's span on this row
        for y in col:
            if y >= y0 - 6:
                left = opaque[y, :x].any() and opaque[y, x:].any()
                if left or y > y0 - 2:
                    out[y, x, :3] = a[y0 + 2, x, :3] * (1.0 + 0.04 * (y0 - y))
                    out[y, x, 3] = 255
    img = Image.fromarray(np.clip(out, 0, 255).astype('uint8'), 'RGBA')
    al = img.getchannel('A')
    opened = al.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(7))   # strands of the crest's outline go
    top = Image.new('L', al.size, 0); ImageDraw.Draw(top).rectangle((0, 0, al.width, int(al.height * 0.42)), fill=255)
    al = Image.composite(Image.fromarray(np.minimum(np.asarray(al), np.asarray(opened))), al, top)
    img.putalpha(al.filter(ImageFilter.GaussianBlur(0.6)))
    return np.asarray(img, dtype=float)


def eyes(a, kind):
    """Thin rings: the pale ring narrowed to its inner edge; wide pale rings: the ring widened into the fur."""
    if kind == 'between':
        return a
    a = a.copy()
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    pale = (r > 170) & (g > 150) & (b > 110) & (np.abs(r - g) < 50)
    yy, xx = np.mgrid[0:H, 0:W]
    fur = np.array([46, 44, 50], dtype=float)
    cream = np.array([228, 212, 182], dtype=float)
    for cx, cy, rr in eye_boxes(a):
        dist = np.hypot(xx - cx, yy - cy)
        ring = pale & (dist < rr * 1.5) & (dist > rr * 0.85)
        if kind == 'thin':
            outer = ring & (dist > rr * 1.12)
            a[outer, :3] = fur
        else:
            lum = a[..., :3].mean(axis=2)
            band = (dist >= rr * 1.2) & (dist < rr * 1.5) & (a[..., 3] > 200) & ~leaf_mask(a) & (lum < 100)
            k = np.clip((rr * 1.5 - dist) / (rr * 0.1), 0, 1)[band][:, None]
            a[band, :3] = a[band, :3] * (1 - k) + cream * k
    return a


def loika(markings, crown, eye):
    a = P.copy()
    if markings == 'pale patches':
        k = patch_mask()[..., None]
        a[..., :3] = a[..., :3] * (1 - k) + M[..., :3] * k
    if crown == 'bare head':
        a = crown_bare(a)
    a = eyes(a, eye)
    img = Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA')
    return img.crop(img.getbbox())


def contact(w, h, alpha=0.6):
    s = Image.new('L', (w * 2, h * 2), 0)
    ImageDraw.Draw(s).ellipse((w // 2, h // 2, w * 3 // 2, h * 3 // 2), fill=int(255 * alpha))
    o = Image.new('RGBA', s.size, (20, 16, 10, 0)); o.putalpha(s.filter(ImageFilter.GaussianBlur(h / 3)))
    return o


FOUR = [('Pip', 'plain', 'leaf crest', 'between'),
        ('Moss', 'pale patches', 'leaf crest', 'wide'),
        ('Fig', 'plain', 'bare head', 'thin'),
        ('Dot', 'pale patches', 'bare head', 'between')]
stands = [(n, loika(m, c, e), m, c, e) for n, m, c, e in FOUR]
BASE_H = PLAIN.crop(PLAIN.getbbox()).height     # one scale for all four: size is not a locus
sc = lambda img, h: img.resize((round(img.width * h / BASE_H), round(img.height * h / BASE_H)), Image.LANCZOS)

# 1) the four stands, side by side, with their looks
sheet = Image.new('RGBA', (4 * 250 + 40, 360), (29, 35, 43, 255)); d = ImageDraw.Draw(sheet)
for i, (n, img, m, c, e) in enumerate(stands):
    s = sc(img, 220)
    x = 20 + i * 250 + (240 - s.width) // 2
    sheet.alpha_composite(contact(s.width - 30, 16, 0.6), (x + 15 + (s.width - 30) // 2 - (s.width - 30), 238))
    sheet.alpha_composite(s, (x, 244 - s.height))
    d.text((20 + i * 250 + 120, 268), n, font=F20, fill=(241, 235, 223), anchor='mm')
    for j, t in enumerate((m, c, {'between': 'between', 'wide': 'wide pale rings', 'thin': 'thin rings'}[e])):
        d.text((20 + i * 250 + 120, 296 + j * 18), t, font=F13, fill=(198, 196, 216), anchor='mm')
sheet.convert('RGB').save(os.path.join(OUT, 'S01-four-stands.png'), optimize=True)
print('S01-four-stands.png')

# 2) Home's living window: today's golden beside the four as themselves
glass = src('home-glass-day-640x488.png')
win = glass.copy()
spots = [(140, 326, 150), (500, 270, 118), (420, 384, 140), (250, 436, 128)]  # feet on the window's own ground (the golden's stand rows)
order = sorted(range(4), key=lambda i: spots[i][1])
for i in order:
    n, img, *_ = stands[i]
    x, y, h = spots[i]
    s = sc(img, h)
    if i in (1, 2):                      # residents face their own ways (routines, not genetics)
        s = s.transpose(Image.FLIP_LEFT_RIGHT)
    cw = int(s.width * 0.42)              # a contact shadow under the feet, on the moss
    win.alpha_composite(contact(cw, 12, 0.62), (x - cw, y - 14))
    win.alpha_composite(s, (x - s.width // 2, y - s.height))
today = src('home-docked.png').crop((16, 48, 672, 552))
out = Image.new('RGBA', (656 + 16 + 640 + 32, 520 + 44), (12, 10, 18, 255)); d = ImageDraw.Draw(out)
d.text((16, 12), 'Today (B-4 golden): one stand for every adult Loika', font=F16, fill=(241, 235, 223))
d.text((656 + 32, 12), 'Proposal: four Loikas drawn as themselves (Pip, Moss, Fig, Dot) · proof, composited', font=F16, fill=(241, 235, 223))
out.alpha_composite(today, (16, 44))
out.alpha_composite(win.crop((0, 0, 640, 488)), (656 + 32, 44))
out.convert('RGB').save(os.path.join(OUT, 'home-window-four-loikas.png'), optimize=True)
print('home-window-four-loikas.png')
