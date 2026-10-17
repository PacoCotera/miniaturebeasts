#!/usr/bin/env python3
"""T-20261016-169: the genome concept G2 on Create (S03 Tuikis) and the Incubator as candling done well.
Composited by hand from accepted and signed art; no generated pixels. Style guide §4 (pane, tile, genome marks,
progress, stamp), §2 palette, §3 light; CD review §3.2 (G2 with the scan-light link) and §3.3 (candling).

  python3 make-g2.py SRC FONTS OUT
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

SRC, FONTS, OUT = sys.argv[1:4]
C = {'void': (12, 10, 18), 'ground': (29, 35, 43), 'bar': (35, 41, 47), 'panel': (43, 48, 56), 'hairline': (61, 67, 75),
     'bevel': (86, 92, 99), 'bone': (241, 235, 223), 'fog': (198, 196, 216), 'mist': (141, 138, 166), 'mint': (173, 246, 224),
     'aqua': (69, 216, 190), 'teal': (31, 157, 143), 'tealD': (15, 76, 80), 'orange': (242, 103, 27), 'focus': (255, 230, 173),
     'frost': (234, 239, 246), 'frostD': (203, 213, 226), 'stone': (93, 89, 116)}
F = lambda w, s: ImageFont.truetype(os.path.join(FONTS, 'Inter-%s.ttf' % w), s)
F16, F20, F13 = F('Regular', 16), F('Medium', 20), F('Regular', 13)
src = lambda n: Image.open(os.path.join(SRC, n)).convert('RGBA')


def pane(d, x, y, w, h, r=8, fill='panel'):
    d.rounded_rectangle((x, y, x + w - 1, y + h - 1), r, fill=C[fill], outline=C['hairline'])
    d.line((x + r, y + 1, x + w - r - 1, y + 1), fill=C['bevel'])
    d.line((x + 1, y + r, x + 1, y + h - r - 1), fill=C['bevel'])


def key_out(img, col, tol=10):
    a = np.asarray(img).copy()
    a[(np.abs(a[..., :3].astype(int) - col).max(axis=2) <= tol), 3] = 0
    return Image.fromarray(a, 'RGBA')


def founder_cutout():
    """The S03 juvenile from its signed source (magenta keyed, despilled, its painted shadow removed): the founder.
    The juvenile is the design the look close-ups and the poses were drawn from, so rack and body are one individual."""
    im = src('mibi-juvenile-S03-a.jpg').convert('RGB')
    a = np.asarray(im).astype(int)
    mag = (a[..., 0] > 170) & (a[..., 2] > 170) & (a[..., 1] < 140)
    A = Image.fromarray(np.where(mag, 0, 255).astype('uint8')).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = im.convert('RGBA'); out.putalpha(A)
    o = np.asarray(out).astype(int)
    sp = (o[..., 0] > o[..., 1] + 40) & (o[..., 2] > o[..., 1] + 40)
    o[sp, 0] = o[sp, 1]; o[sp, 2] = o[sp, 1] + 10
    h = o.shape[0]
    rgb = o[..., :3]
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    lum = rgb.mean(axis=2)
    yy = np.arange(h)[:, None]
    purple = (rgb[..., 0] > rgb[..., 1] + 6) & (rgb[..., 2] > rgb[..., 1] + 6)
    shadow = (yy > h * 0.72) & (((sat < 34) & (lum > 60) & (lum < 175)) | (purple & (lum < 200)))
    o[shadow, 3] = 0
    out = Image.fromarray(np.clip(o, 0, 255).astype('uint8'), 'RGBA')
    a2 = out.getchannel('A').filter(ImageFilter.MedianFilter(3)); out.putalpha(a2)
    return out.crop(out.getbbox())


FULL = founder_cutout()
K = FULL.height / 340                     # crops are given in the 340-high founder's pixels


def crop340(x0, y0, x1, y1, size=44, bg=True):
    c = FULL.crop((int(x0 * K), int(y0 * K), int(x1 * K), int(y1 * K)))
    s = size / max(c.width, c.height)
    c = c.resize((max(1, round(c.width * s)), max(1, round(c.height * s))), Image.LANCZOS)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.alpha_composite(c, ((size - c.width) // 2, (size - c.height) // 2))
    return out


def fit(img, size=44):
    img = img.crop(img.getbbox()) if img.getbbox() else img
    s = size / max(img.width, img.height)
    img = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0)); out.alpha_composite(img, ((size - img.width) // 2, (size - img.height) // 2))
    return out


def scan_light(fig, box, strength=0.5):
    """The bench's scan light falling on one part of the founder (a soft mint wash within the figure)."""
    m = Image.new('L', fig.size, 0)
    ImageDraw.Draw(m).ellipse(box, fill=255)
    m = m.filter(ImageFilter.GaussianBlur(10))
    a = np.asarray(fig, dtype=float)
    k = np.asarray(m, dtype=float)[..., None] / 255 * strength * (a[..., 3:4] / 255)
    a[..., :3] = a[..., :3] + (np.array(C['mint']) - a[..., :3]) * k
    return Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA')


def contact(w, h, alpha=0.6):
    s = Image.new('L', (w * 2, h * 2), 0)
    ImageDraw.Draw(s).ellipse((w // 2, h // 2, w * 3 // 2, h * 3 // 2), fill=int(255 * alpha))
    o = Image.new('RGBA', s.size, (10, 12, 16, 0)); o.putalpha(s.filter(ImageFilter.GaussianBlur(h / 3)))
    return o


def species_pod(code='S03'):
    pod = json.load(open(os.path.join(SRC, 'species-%s.json' % code)))['pod']
    ld = lambda n: np.asarray(src('pod-collection-%s.png' % n), dtype=float) / 255
    sh, bd, ac = ld('shade'), ld('mask-body')[..., 3], ld('mask-accent')[..., 3]
    pt, rl = ld('pattern-plates')[..., 3], ld('pattern-plates-relief')[..., 0] * 2
    A, B = [np.array([int(c['hex'][i:i + 2], 16) / 255 for i in (1, 3, 5)]) for c in pod['colourPair']]
    rgb = np.minimum(1, (A * (bd * (1 - pt))[..., None] + B * np.minimum(1, ac + pt)[..., None]) * sh[..., :1] * 2 * rl[..., None])
    return Image.fromarray((np.dstack([rgb, sh[..., 3:4]]) * 255).round().astype('uint8'), 'RGBA')


def ring(size, frac, studs=0, lit=0, thick=6):
    k = 8
    im = Image.new('RGBA', (size * k, size * k), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    b = (thick * k, thick * k, (size - thick) * k, (size - thick) * k)
    d.arc(b, 135, 405, fill=C['tealD'], width=thick * k)
    if frac:
        d.arc(b, 135, 135 + 270 * frac, fill=C['mint'], width=thick * k)
    import math
    r = (size - 2 * thick) * k / 2
    for i in range(studs):
        a = math.radians(135 + 270 * (i + 1) / (studs + 1))
        cx, cy = size * k / 2 + r * math.cos(a), size * k / 2 + r * math.sin(a)
        rr = 4.5 * k
        d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=C['mint'] if i < lit else C['ground'], outline=C['tealD'] if i >= lit else None, width=k)
    return im.resize((size, size), Image.LANCZOS)


def icons():
    h = src('home-docked.png')
    g = lambda x: key_out(h.crop((x, 10, x + 16, 26)), C['bar'], 12)
    return {'energy': g(437), 'data': g(497), 'essence': g(552)}


def price(parts):
    ic = icons()
    im = Image.new('RGBA', (200, 24), (0, 0, 0, 0)); d = ImageDraw.Draw(im); x = 0
    for k, n in parts:
        im.alpha_composite(ic[k], (x, 4)); d.text((x + 20, 2), str(n), font=F16, fill=C['focus']); x += 20 + int(F16.getlength(str(n))) + 14
    return im.crop((0, 0, x, 24))


def frame(title_from, verb, pr, context, back):
    im = Image.new('RGBA', (1024, 600), C['ground'] + (255,))
    im.alpha_composite(src(title_from).crop((0, 0, 1024, 40)))
    d = ImageDraw.Draw(im)
    d.rectangle((0, 562, 1023, 599), fill=C['bar']); d.line((0, 562, 1023, 562), fill=C['void'])
    im.alpha_composite(src('frame-cap-confirm-16.png'), (16, 574))
    d.text((36, 572), verb, font=F16, fill=C['orange'])
    if pr is not None:
        im.alpha_composite(pr, (int(36 + F16.getlength(verb) + 24), 570))
    if context:
        d.text((512, 582), context, font=F16, fill=C['mist'], anchor='mm')
    im.alpha_composite(src('frame-cap-back-16.png'), (int(1008 - 4 - F16.getlength(back) - 16), 574))
    d.text((1008, 582), back, font=F16, fill=C['fog'], anchor='rm')
    return im, d


# --- the gene pictures: each tile is this founder's current look of that trait -------------------------------
L = lambda n: fit(src('look-S03-%s-64x64.png' % n))
GENES = {
    'Coat': [('Colour', crop340(40, 30, 120, 80), 'changed'), ('Trim', crop340(165, 235, 235, 290), 'open'),
             ('Markings', L('markings-spots'), 'one'), ('Scales', L('scales-few-fine'), 'open')],
    'Face': [('Crest', L('crest-tall-crest'), 'open'), ('Eyes', crop340(0, 80, 140, 145), 'changed-focus'),
             ('Snout', crop340(25, 125, 85, 175), 'one')],
    'Shape': [('Build', crop340(60, 140, 310, 290), 'open'), ('Haunch', crop340(220, 160, 310, 285), 'one'),
              ('Topline', crop340(150, 135, 300, 185), 'open')],
    'Legs & tail': [('Legs', crop340(60, 230, 310, 335), 'open'), ('Claws', fit(src('trait-S03-claws-round-feet-104x96.png')), 'breeding'),
                    ('Tail', L('tail-long-thick'), 'one'), ('Carriage', L('carriage-curls-up'), 'open')],
}
DOINGS = [('Movement', 4), ('Stamina', 3), ('Character', 2), ('Glow', 2)]


def pose_glow():
    """The S03 glow pose from its signed source, keyed off its dark ground: the Glow row's behaviour picture."""
    im = src('pose-S03-glow.jpg').convert('RGB')
    a = np.asarray(im).astype(int)
    bg = np.array([27, 49, 60])
    dist = np.abs(a - bg).max(axis=2)
    A = Image.fromarray(np.clip((dist - 14) * 9, 0, 255).astype('uint8')).filter(ImageFilter.MedianFilter(5))
    out = im.convert('RGBA'); out.putalpha(A)
    return out.crop(out.getbbox())


HEADS = {'Coat': crop340(150, 140, 290, 280, 48), 'Face': crop340(0, 25, 190, 200, 48), 'Shape': fit(FULL, 48),
         'Legs & tail': crop340(60, 20, 364, 335, 48), 'Glow': fit(pose_glow(), 48)}


def gene_tile(im, d, x, y, pic, state, size=48):
    d.rounded_rectangle((x, y, x + size - 1, y + size - 1), 6, fill=C['ground'], outline=C['hairline'])
    d.line((x + 6, y + 1, x + size - 7, y + 1), fill=C['bevel'])
    if pic is not None:
        im.alpha_composite(pic, (x + (size - pic.width) // 2, y + (size - pic.height) // 2))
    if state.startswith('changed'):          # changed: lit mint, with the notch
        d.rounded_rectangle((x - 1, y - 1, x + size, y + size), 7, outline=C['mint'], width=2)
        d.rectangle((x + size - 3, y + size // 2 - 6, x + size + 1, y + size // 2 + 6), fill=C['mint'])
    if state == 'one':                        # one look: both copies the same
        d.rounded_rectangle((x + 12, y + size - 7, x + size - 13, y + size - 4), 2, fill=C['mist'])
    if state in ('breeding', 'doing'):        # only breeding changes it: the joined rings
        for dx in (-6, 6):
            d.ellipse((x + size // 2 + dx - 7, y + size - 16, x + size // 2 + dx + 7, y + size - 2), outline=C['fog'], width=2)
    if state.endswith('focus'):
        d.rounded_rectangle((x - 5, y - 5, x + size + 4, y + size + 4), 10, outline=C['focus'], width=2)
        d.polygon([(x + size // 2 - 5, y - 9), (x + size // 2 + 5, y - 9), (x + size // 2, y - 14)], fill=C['focus'])
        d.polygon([(x + size // 2 - 5, y + size + 8), (x + size // 2 + 5, y + size + 8), (x + size // 2, y + size + 13)], fill=C['focus'])


def rack(im, d, x0, y0, w, pitch, size, words=True, heads=True, focus_row=None, lit_rows=(), compact=False):
    rows = list(GENES.items()) + [(n, None) for n, _ in DOINGS]
    for r, (name, genes) in enumerate(rows):
        y = y0 + r * pitch
        pane(d, x0, y, w, pitch - 8, 8, 'panel')
        if name == focus_row:
            d.rounded_rectangle((x0, y, x0 + w - 1, y + pitch - 9), 8, outline=C['aqua'], width=1)
        hx = x0 + 8
        if heads:
            d.rounded_rectangle((hx, y + (pitch - 8 - size) // 2, hx + size - 1, y + (pitch - 8 - size) // 2 + size - 1), 6, fill=C['ground'])
            hp = HEADS.get(name)
            if hp is not None:
                hp = fit(hp, size - 4)
                im.alpha_composite(hp, (hx + 2, y + (pitch - 8 - size) // 2 + 2))
        gx = hx + (size + 12 if heads else 0)
        if words:
            d.text((gx, y + (pitch - 8) // 2), name, font=F20, fill=C['bone'], anchor='lm')
            gx += 132
        if genes is None:
            n = dict(DOINGS)[name]
            for i in range(n):
                gene_tile(im, d, gx + i * (size + 8), y + (pitch - 8 - size) // 2, None, 'doing', size)
        else:
            for i, (t, pic, st) in enumerate(genes):
                p = fit(pic, size - 6)
                gene_tile(im, d, gx + i * (size + 8), y + (pitch - 8 - size) // 2, p, st if not compact else st.replace('-focus', ''), size)


# --- G2 on Create ---------------------------------------------------------------------------------------------
im, d = frame('create-shape.png', 'Grow it', price([('energy', 2), ('essence', 4), ('data', 3)]), 'Eyes: big, wide', 'Tuikis')
# the scanning recess
d.rounded_rectangle((16, 48, 407, 552), 14, fill=(22, 27, 34), outline=C['hairline'])
pool = Image.new('L', (1024, 600), 0); ImageDraw.Draw(pool).ellipse((40, 30, 380, 470), fill=60)
warm = Image.new('RGBA', (1024, 600), (255, 236, 212, 0)); warm.putalpha(pool.filter(ImageFilter.GaussianBlur(50)))
clip = Image.new('L', (1024, 600), 0); ImageDraw.Draw(clip).rounded_rectangle((16, 48, 407, 552), 14, fill=255)
warm.putalpha(ImageChops.multiply(warm.getchannel('A'), clip)); im.alpha_composite(warm)
fh = 300
fig = FULL.resize((round(FULL.width * fh / FULL.height), fh), Image.LANCZOS)
s = fh / 340
fig = scan_light(fig, (int(-10 * s), int(70 * s), int(150 * s), int(155 * s)), 0.85)   # the scan light on the eyes
fx, fy = 212 - fig.width // 2, 404 - fh
sh = contact(fig.width - 40, 22, 0.7)
im.alpha_composite(sh, (212 - sh.width // 2, 400 - sh.height // 2 - 4))
im.alpha_composite(fig, (fx, fy))
# the pod in its socket
d.rounded_rectangle((32, 424, 136, 536), 10, fill=C['ground'], outline=C['hairline'])
pod = species_pod('S03').resize((66, 84), Image.LANCZOS)
im.alpha_composite(contact(70, 10, 0.5), (49, 506)); im.alpha_composite(pod, (51, 436))
# the rack
rack(im, d, 424, 48, 584, 63, 48, focus_row='Face')
d.text((16 + 136 + 16, 518), 'G2 · the gene rack, the body answering in light', font=F13, fill=C['fog'])
d.text((16 + 136 + 16, 534), 'concept, composited from signed art', font=F13, fill=C['mist'])
im.convert('RGB').save(os.path.join(OUT, 'G2-create-s03.png'), optimize=True)
print('G2-create-s03.png')

# --- the Incubator, candling done well ------------------------------------------------------------------------
im, d = frame('create-shape.png', 'Grow now', price([('essence', 3)]), 'ready in about 12 min', 'Home')
d.rectangle((0, 0, 254, 39), fill=C['bar'])
im.alpha_composite(src('frame-room-research-24.png'), (16, 8))
d.text((48, 20), 'Incubator', font=F20, fill=C['bone'], anchor='lm')
# compact rack, no words, genes 40
pane(d, 16, 48, 280, 504, 10, 'panel')
rack(im, d, 24, 56, 264, 61, 40, words=False, heads=True, compact=True)
# the chamber
d.rounded_rectangle((312, 48, 711, 552), 14, fill=(22, 27, 34), outline=C['hairline'])
cx, cy = 512, 300
cw, ch = 220, 300
x0, y0 = cx - cw // 2, cy - ch // 2
d.rounded_rectangle((x0 - 8, y0 - 8, x0 + cw + 7, y0 + ch + 7), 26, fill=(16, 20, 26))
d.rounded_rectangle((x0, y0, x0 + cw - 1, y0 + ch - 1), 22, fill=(11, 14, 19))
pod = species_pod('S03')
pod = pod.resize((132, 168), Image.LANCZOS)
a = np.asarray(pod, dtype=float)
yy = np.linspace(0, 1, a.shape[0])[:, None, None] ** 1.3
a[..., :3] = a[..., :3] + (np.array([226, 252, 242]) - a[..., :3]) * (0.72 * yy)
pod = Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA')
sil = FULL.resize((round(FULL.width * 92 / FULL.height), 92), Image.LANCZOS)
# known parts in colour (Coat, Face: the founder's own colour), unknown parts frost
silc = Image.new('RGBA', sil.size, (0, 0, 0, 0))
known = np.asarray(sil, dtype=float)
mask_known = np.zeros(known.shape[:2]); mask_known[: int(sil.height * 0.55), :] = 1          # head and shoulders read
fr = np.array(C['frostD'], dtype=float)
known[..., :3] = known[..., :3] * mask_known[..., None] + fr * (1 - mask_known[..., None])
known[..., 3] *= 1.0
inner = Image.fromarray(np.clip(known, 0, 255).astype('uint8'), 'RGBA').filter(ImageFilter.GaussianBlur(1.4))
lay = Image.new('RGBA', pod.size, (0, 0, 0, 0)); lay.alpha_composite(inner, ((pod.width - inner.width) // 2, 48))
lay.putalpha(ImageChops.multiply(lay.getchannel('A'), pod.getchannel('A')))
pod.alpha_composite(lay)
px, py = cx - 66, y0 + ch - 168 - 34
pool = Image.new('L', (1024, 600), 0); ImageDraw.Draw(pool).ellipse((cx - 80, y0 + ch - 52, cx + 80, y0 + ch - 8), fill=150)
lamp = Image.new('RGBA', (1024, 600), (200, 250, 236, 0)); lamp.putalpha(pool.filter(ImageFilter.GaussianBlur(10)))
clip = Image.new('L', (1024, 600), 0); ImageDraw.Draw(clip).rounded_rectangle((x0, y0, x0 + cw - 1, y0 + ch - 1), 22, fill=255)
lamp.putalpha(ImageChops.multiply(lamp.getchannel('A'), clip)); im.alpha_composite(lamp)
d.rounded_rectangle((cx - 30, y0 + ch - 18, cx + 30, y0 + ch - 12), 3, fill=C['mint'])
d.rectangle((cx - 40, py + 146, cx + 40, py + 154), fill=(70, 78, 86))
im.alpha_composite(pod, (px, py))
d.rounded_rectangle((x0, y0, x0 + cw - 1, y0 + ch - 1), 22, outline=(110, 126, 136))
hl = Image.new('L', (1024, 600), 0); ImageDraw.Draw(hl).rounded_rectangle((x0 + 12, y0 + 14, x0 + 26, y0 + 80), 7, fill=24)
gl = Image.new('RGBA', (1024, 600), (255, 255, 255, 0)); gl.putalpha(hl.filter(ImageFilter.GaussianBlur(5))); im.alpha_composite(gl)
im.alpha_composite(ring(380, 0.55, studs=8, lit=4, thick=8), (cx - 190, cy - 190))
# the reveal: the founder's own part, large, with plain words
pane(d, 728, 48, 280, 312, 10, 'panel')
d.rounded_rectangle((744, 64, 991, 260), 8, fill=C['ground'])
rv = src('trait-S03-crest-tall-crest-128x160.png')
im.alpha_composite(rv, (868 - rv.width // 2, 64 + (196 - rv.height) // 2))
d.text((744, 280), 'Crest', font=F20, fill=C['bone'])
d.text((744, 312), 'a tall crest', font=F16, fill=C['fog'])
# the stamp, drawn on the display, with its id
pane(d, 728, 376, 280, 176, 10, 'panel')
st = src('stamp-s03-300.png').resize((112, 112), Image.LANCZOS)
sa = np.asarray(st, dtype=float); sa[..., :3] *= np.array([0.52, 0.50, 0.46])   # the stamp drawn on the display, never the brightest thing
st = Image.fromarray(np.clip(sa, 0, 255).astype('uint8'), 'RGBA')
im.alpha_composite(st, (744, 408))
d.text((872, 464), 'K7Q 4MX P2D', font=F20, fill=C['mint'], anchor='lm')
d.text((328, 520), 'Candling, done as an instrument · concept, composited from signed art', font=F13, fill=C['fog'])
im.convert('RGB').save(os.path.join(OUT, 'incubator-candling-s03.png'), optimize=True)
print('incubator-candling-s03.png')
