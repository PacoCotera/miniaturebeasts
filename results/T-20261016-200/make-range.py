#!/usr/bin/env python3
"""T-20261016-200: the Loika's look range as layers (art director's proof, provisional looks until the new S01 frame).
Colour is painted as a ramp (shadow, mid, highlight) driven by the stand's own shading, so the form, the light from the
top left and the fur's texture stay; it is never a flat tint. Coat marks are layers that follow the form: their tone is
the cream of the belly, shaded by the fur under them. Built on T-190's layered stands (make-stands.py).

  python3 make-range.py SRC FONTS OUT
"""
import os, sys
here = os.path.dirname(os.path.abspath(__file__))
ms = open(os.path.join(here, '..', 'T-20261016-190', 'make-stands.py')).read()
exec(ms[:ms.index('FOUR = [')])  # T-190's stand layers: loika(markings, crown, eyes), leaf_mask, patch_mask, contact

# provisional colour looks: shadow, mid, highlight (the frame names them; these are the art's ramps)
RAMPS = {
    'charcoal': None,  # the accepted stand as painted
    'cocoa':  ((34, 22, 17), (92, 62, 45), (158, 116, 86)),
    'russet': ((46, 20, 13), (138, 62, 33), (212, 122, 74)),
    'slate':  ((24, 30, 44), (66, 82, 108), (128, 148, 176)),
    'plum':   ((32, 20, 38), (90, 60, 104), (158, 122, 172)),  # not green: the crest is leaf and Home's floor is moss
}
CREAM = np.array([232, 214, 184], dtype=float)


def fur_mask(a):
    mx, mn = a[..., :3].max(axis=2), a[..., :3].min(axis=2)
    m = (a[..., 3] > 40) & (mx < 140) & ((mx - mn) < 50) & ~leaf_mask(a)
    return m


def recolour(img, ramp, m=None):
    """Colour as a painted ramp over the fur's own value: t is the fur's lightness, the ramp maps it, the fine texture
    rides on top. Shadows lean cool and highlights warm within each ramp, as the scene's light does."""
    if ramp is None:
        return img
    a = np.asarray(img, dtype=float).copy()
    m = fur_mask(a) if m is None else m
    lum = a[..., :3].mean(axis=2)
    lo, hi = np.percentile(lum[m], 3), np.percentile(lum[m], 99)
    t = np.clip((lum - lo) / (hi - lo + 1e-6), 0, 1)
    s, md, h = [np.array(c, dtype=float) for c in ramp]
    col = np.where((t < 0.5)[..., None], s + (md - s) * (t / 0.5)[..., None], md + (h - md) * ((t - 0.5) / 0.5)[..., None])
    blur = np.asarray(Image.fromarray(lum.astype('uint8')).filter(ImageFilter.GaussianBlur(1.2)), dtype=float)
    col = col + (lum - blur)[..., None] * 0.9                      # keep the painted fur grain
    soft = np.asarray(Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.7)), dtype=float)[..., None] / 255
    a[..., :3] = a[..., :3] * (1 - soft) + col * soft
    return Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA')


def body_band(a, m):
    """The fur's bounding box (the mask is the base stand's, before any recolour)."""
    ys, xs = np.nonzero(m)
    return m, xs.min(), xs.max(), ys.min(), ys.max()


def marks(img, kind, m, facing_left=True, seed=3):
    """Coat marks as a layer: spots (pale, on the flank), saddle (a deeper band over the back)."""
    if kind in ('none', 'pale patches'):
        return img
    a = np.asarray(img, dtype=float).copy()
    m, x0, x1, y0, y1 = body_band(a, m)
    w, h = x1 - x0, y1 - y0
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    lum = a[..., :3].mean(axis=2)
    shade = np.clip(lum / max(1, np.percentile(lum[m], 95)), 0.35, 1.0)[..., None]
    rear = (xx > x0 + w * 0.42) if facing_left else (xx < x1 - w * 0.42)
    if kind == 'spots':
        rng = np.random.default_rng(seed)
        k = np.zeros(lum.shape)
        placed, tries = [], 0
        while len(placed) < 11 and tries < 4000:   # spread over the flank, never clumped
            tries += 1
            cx = rng.uniform(x0 + w * (0.40 if facing_left else 0.06), x1 - w * (0.06 if facing_left else 0.40))
            cy = rng.uniform(y0 + h * 0.22, y0 + h * 0.72)
            r = rng.uniform(w * 0.028, w * 0.05)
            if not m[int(cy), int(cx)] or any(np.hypot(cx - px, cy - py) < (r + pr) * 1.9 for px, py, pr in placed):
                continue
            placed.append((cx, cy, r))
            k = np.maximum(k, np.clip((r - np.hypot(xx - cx, yy - cy)) / 1.6, 0, 1))
        k = k * m
        tone = CREAM * (0.45 + 0.65 * shade)
        a[..., :3] = a[..., :3] * (1 - k[..., None]) + tone * k[..., None]
    elif kind == 'saddle':
        top = np.zeros(lum.shape, dtype=bool)
        for x in range(x0, x1 + 1):
            col = np.nonzero(m[:, x])[0]
            if len(col):
                top[col.min():col.min() + int(h * 0.32), x] = True
        k = (top & m & rear).astype(float)
        k = np.asarray(Image.fromarray((k * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(4)), dtype=float) / 255 * m
        a[..., :3] = a[..., :3] * (1 - 0.48 * k[..., None])
    return Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA')


def stand(colour, mark, crown='leaf crest', eye='between'):
    base = loika('pale patches' if mark == 'pale patches' else 'plain', crown, eye)
    m = fur_mask(np.asarray(base, dtype=float))      # one mask from the base stand drives every layer
    return marks(recolour(base, RAMPS[colour], m), mark, m)


def fit(img, w, h):
    k = min(w / img.width, h / img.height)
    return img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)


COLOURS = list(RAMPS)
MARKS = ['none', 'pale patches', 'spots', 'saddle']
CW, CH = 160, 172
sheet = Image.new('RGBA', (120 + len(MARKS) * CW + 24, 56 + len(COLOURS) * CH + 210), (29, 35, 43, 255))
d = ImageDraw.Draw(sheet)
d.text((16, 14), 'The Loika\'s looks at Home\'s resident size (144 x 152), 1x. Provisional names until the new S01 frame.', font=F13, fill=(241, 235, 223))
for j, mk in enumerate(MARKS):
    d.text((120 + j * CW + CW // 2, 44), mk, font=F13, fill=(198, 196, 216), anchor='mm')
for i, col in enumerate(COLOURS):
    y = 56 + i * CH
    d.text((16, y + CH // 2), col, font=F16, fill=(198, 196, 216), anchor='lm')
    for j, mk in enumerate(MARKS):
        s = fit(stand(col, mk), 144, 152)
        x = 120 + j * CW + (CW - s.width) // 2
        base = y + 160
        sheet.alpha_composite(contact(int(s.width * 0.42), 10, 0.55), (x + s.width // 2 - int(s.width * 0.42), base - 12))
        sheet.alpha_composite(s, (x, base - s.height))
# the juvenile at its size (104 x 112): its dark cap takes the colour; marks wait for its own layers
y = 56 + len(COLOURS) * CH + 18
d.text((16, y), 'The juvenile stand-in at 104 x 112, recoloured the same way (its marks are its own layers, to come)', font=F13, fill=(198, 196, 216))
juv = src('mibi-juvenile-S01-304x312.png'); juv = juv.crop(juv.getbbox())
for i, col in enumerate(COLOURS):
    s = fit(recolour(juv, RAMPS[col]), 104, 112)
    x = 120 + i * 128
    sheet.alpha_composite(contact(int(s.width * 0.42), 8, 0.55), (x + s.width // 2 - int(s.width * 0.42), y + 150))
    sheet.alpha_composite(s, (x, y + 160 - s.height))
    d.text((x + s.width // 2, y + 176), col, font=F13, fill=(198, 196, 216), anchor='mm')
sheet.convert('RGB').save(os.path.join(OUT, 'loika-range-home-size.png'), optimize=True)
print('loika-range-home-size.png')
