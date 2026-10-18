#!/usr/bin/env python3
"""Cuts the Loika's layered stand (T-20261016-201) from the accepted Pip pair, as the proof of T-20261016-190 did (make-stands.py):
the base is the accepted stand (rich-plain-300x310) on a 304x312 canvas; each look a stand can show is a cut-out layer over it.
  Markings  patches      an over layer: the accepted marked/plain pair's difference
  Crown     bare head    an erase layer (the crest's pixels go) and an over layer (the head closed from the fur below)
  Eyes      thin rings   an over layer (the pale ring narrowed to its inner edge)
            wide pale rings  an over layer (the ring widened into the fur)
The layers are proof-quality stand-ins (the crown and the rings are edits, not paintings) until the masters land; the register says so.
Each size is derived DOWN from the 304x312 canvas (never up), and base and layers are cut with the same transform.

  python3 prototypes/station/tools/make-stand-layers.py            (writes prototypes/ui/assets/stands/)
"""
import hashlib, json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../..'))
SRC = os.path.join(ROOT, 'art/miniature-lives/assets')
OUT = os.path.join(ROOT, 'prototypes/ui/assets/stands')
CW, CH = 304, 312                               # the close stand's canvas; the 300x310 painting sits on it at (2, 1)
SIZES = [(304, 312), (144, 152), (48, 48)]      # the standing pictures of an adult: up close, the living window's resident, the token

def load(n):
    im = Image.open(os.path.join(SRC, n)).convert('RGBA')
    c = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); c.alpha_composite(im, (2, 1))
    return np.asarray(c, dtype=float)

P, M = load('rich-plain-300x310.png'), load('rich-marked-300x310.png')
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
        boxes.append((x.mean(), y.mean(), max(x.max() - x.min(), y.max() - y.min()) / 2))
    return boxes

def crown_bare(a):
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
        for y in col:
            if y >= y0 - 6:
                left = opaque[y, :x].any() and opaque[y, x:].any()
                if left or y > y0 - 2:
                    out[y, x, :3] = a[y0 + 2, x, :3] * (1.0 + 0.04 * (y0 - y))
                    out[y, x, 3] = 255
    img = Image.fromarray(np.clip(out, 0, 255).astype('uint8'), 'RGBA')
    al = img.getchannel('A')
    opened = al.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(7))
    top = Image.new('L', al.size, 0); ImageDraw.Draw(top).rectangle((0, 0, al.width, int(al.height * 0.42)), fill=255)
    al = Image.composite(Image.fromarray(np.minimum(np.asarray(al), np.asarray(opened))), al, top)
    img.putalpha(al.filter(ImageFilter.GaussianBlur(0.6)))
    return np.asarray(img, dtype=float)

def eyes(a, kind):
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
            a[ring & (dist > rr * 1.12), :3] = fur
        else:
            lum = a[..., :3].mean(axis=2)
            band = (dist >= rr * 1.2) & (dist < rr * 1.5) & (a[..., 3] > 200) & ~leaf_mask(a) & (lum < 100)
            k = np.clip((rr * 1.5 - dist) / (rr * 0.1), 0, 1)[band][:, None]
            a[band, :3] = a[band, :3] * (1 - k) + cream * k
    return a

def over_layer(new, old, thresh=1.0):
    """The pixels that differ, as an RGBA layer to lay over `old` (alpha is the new pixel's, where it is at least the old)."""
    d = (np.abs(new - old).max(axis=2) > thresh) & (new[..., 3] >= old[..., 3] - 0.5)
    out = np.zeros_like(new); out[d] = new[d]
    return out

def erase_layer(new, old):
    """The pixels the look removes: alpha is how much of the old pixel goes."""
    out = np.zeros_like(old); out[..., :3] = 255
    out[..., 3] = np.clip(old[..., 3] - new[..., 3], 0, 255)
    return out

# ---- the layers at the canvas size ----
k = patch_mask()[..., None]
# the patches: the marked stand's pixels at the patch coverage, only inside the body (a crest's edge, which the two paintings render a little differently, is never part of it)
patches = np.zeros_like(P); patches[..., :3] = M[..., :3]; patches[..., 3] = k[..., 0] * 255 * (P[..., 3] >= 250)
bare = crown_bare(P)
# the crown edit is the head's: its delta fades out below the head, so the body's outline is never touched (the proof's blur reached every edge)
ramp = np.clip((175 - np.arange(H)) / 55.0, 0, 1)[:, None, None]
bare = P + ramp * (bare - P)
LAYERS = [   # (trait, look, order, op, name, canvas layer)
    ('markings', 'patches', 10, 'over', 'patches', patches),
    ('crown', 'bare head', 20, 'erase', 'bare-erase', erase_layer(bare, P)),
    ('crown', 'bare head', 21, 'over', 'bare-fill', over_layer(bare, P)),
    ('eye-rings', 'thin rings', 30, 'over', 'eyes-thin', over_layer(eyes(P, 'thin'), P)),
    ('eye-rings', 'wide pale rings', 30, 'over', 'eyes-wide', over_layer(eyes(P, 'wide'), P)),
]

def fit(arr, w, h):
    """The canvas derived down to w x h: scaled by the one factor that fits, bottom-centred (premultiplied resampling)."""
    im = Image.fromarray(np.clip(arr, 0, 255).astype('uint8'), 'RGBA')
    if (w, h) == (CW, CH):
        return im
    s = min(w / CW, h / CH)
    nw, nh = max(1, round(CW * s)), max(1, round(CH * s))
    small = im.resize((nw, nh), Image.LANCZOS)
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0)); out.alpha_composite(small, ((w - nw) // 2, h - nh))
    return out

os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith('.png'): os.remove(os.path.join(OUT, f))
files = {}
def save(img, name):
    p = os.path.join(OUT, name); img.save(p, optimize=True)
    b = open(p, 'rb').read()
    files[name] = {'file': name, 'w': img.width, 'h': img.height, 'sha256': hashlib.sha256(b).hexdigest()}
    return name

sets = {}
for (w, h) in SIZES:
    key = f'{w}x{h}'
    base = save(fit(P, w, h), f'S01-adult-{key}-base.png')
    layers = []
    for trait, look, order, op, name, arr in LAYERS:
        layers.append({'trait': trait, 'look': look, 'order': order, 'op': op, 'file': save(fit(arr, w, h), f'S01-adult-{key}-{name}.png')})
    sets[key] = {'base': base, 'layers': layers}
index = {
    'schema': 'mb-stands/1',
    'note': 'Layered stands: a base plus one cut-out layer per look a stand can show, chosen by drawnLooks (prototypes/station/src/looks.mjs). Proof-quality stand-ins cut from the accepted Pip pair by prototypes/station/tools/make-stand-layers.py, until the painted masters land.',
    'status': 'placeholder',
    'stands': {'S01': {'adult': {'traits': ['markings', 'crown', 'eye-rings'], 'sizes': sets}}},
    'files': dict(sorted(files.items())),
}
json.dump(index, open(os.path.join(OUT, 'index.json'), 'w'), indent=1); open(os.path.join(OUT, 'index.json'), 'a').write('\n')
print(len(files), 'files in', OUT)
