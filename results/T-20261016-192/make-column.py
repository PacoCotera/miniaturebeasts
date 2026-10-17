#!/usr/bin/env python3
"""T-20261016-192: Home's module column in fixed places, answering state (art director's treatment).
Fixed places and order; each pane holds the object of the screen it opens, in a well with its contact shadow;
the game designer's tiers: Forward (at most one: the module ✓ acts on: lit, larger, amber lamp), Live (at rest),
Quiet (dimmed in its well). Composited from signed art over the accepted Home captures; no generated pixels.

  python3 make-column.py SRC FONTS OUT
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

SRC, FONTS, OUT = sys.argv[1:4]
C = {'void': (12, 10, 18), 'ground': (29, 35, 43), 'bar': (35, 41, 47), 'panel': (43, 48, 56), 'hairline': (61, 67, 75),
     'bevel': (86, 92, 99), 'bone': (241, 235, 223), 'fog': (198, 196, 216), 'mist': (141, 138, 166), 'mint': (173, 246, 224),
     'tealD': (15, 76, 80), 'night': (41, 37, 58), 'amber': (255, 168, 63)}
F = lambda w, s: ImageFont.truetype(os.path.join(FONTS, 'Inter-%s.ttf' % w), s)
F16, F13 = F('Regular', 16), F('Regular', 13)
src = lambda n: Image.open(os.path.join(SRC, n)).convert('RGBA')


def pane(d, x, y, w, h, r=8, fill='panel'):
    d.rounded_rectangle((x, y, x + w - 1, y + h - 1), r, fill=C[fill], outline=C['hairline'])
    d.line((x + r, y + 1, x + w - r - 1, y + 1), fill=C['bevel'])
    d.line((x + 1, y + r, x + 1, y + h - r - 1), fill=C['bevel'])


def shade(img, k):
    a = np.asarray(img, dtype=float); a[..., :3] *= k
    return Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA')


def contact(w, h, alpha=0.6):
    s = Image.new('L', (w * 2, h * 2), 0)
    ImageDraw.Draw(s).ellipse((w // 2, h // 2, w * 3 // 2, h * 3 // 2), fill=int(255 * alpha))
    o = Image.new('RGBA', s.size, (6, 8, 12, 0)); o.putalpha(s.filter(ImageFilter.GaussianBlur(h / 3)))
    return o


def species_pod(code):
    pod = json.load(open(os.path.join(SRC, 'species-%s.json' % code)))['pod']
    pat = {'smooth dots': 'dots', 'soft ribs': 'ribs', 'segments': 'segments', 'plates': 'plates'}
    name = next((v for k, v in pat.items() if k in (pod.get('shellPattern') or '')), None)
    has = lambda n: os.path.exists(os.path.join(SRC, 'pod-collection-%s.png' % n))
    ld = lambda n: np.asarray(src('pod-collection-%s.png' % n), dtype=float) / 255
    sh, bd, ac = ld('shade'), ld('mask-body')[..., 3], ld('mask-accent')[..., 3]
    pt = ld('pattern-' + name)[..., 3] if name and has('pattern-' + name) else 0 * bd
    rl = ld('pattern-%s-relief' % name)[..., 0] * 2 if name and has('pattern-%s-relief' % name) else np.ones_like(bd)
    A, B = [np.array([int(c['hex'][i:i + 2], 16) / 255 for i in (1, 3, 5)]) for c in pod['colourPair']]
    rgb = np.minimum(1, (A * (bd * (1 - pt))[..., None] + B * np.minimum(1, ac + pt)[..., None]) * sh[..., :1] * 2 * rl[..., None])
    return Image.fromarray((np.dstack([rgb, sh[..., 3:4]]) * 255).round().astype('uint8'), 'RGBA')


def ring(size, frac, thick=4):
    k = 8
    im = Image.new('RGBA', (size * k, size * k), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    b = (thick * k, thick * k, (size - thick) * k, (size - thick) * k)
    d.arc(b, 135, 405, fill=C['tealD'], width=thick * k)
    if frac:
        d.arc(b, 135, 135 + 270 * frac, fill=C['mint'], width=thick * k)
    return im.resize((size, size), Image.LANCZOS)


def book():
    h = src('home-docked.png')
    lib = h.crop((826, 472, 878, 542))
    a = np.asarray(lib).copy()
    m = (np.abs(a[..., :3].astype(int) - [54, 46, 40]).max(axis=2) <= 12)
    a[m, 3] = 0
    return Image.fromarray(a, 'RGBA')


WELL = (104, 8, 176, 78)   # the well inside each pane, relative to the pane


def well_light(im, x, y, w, h, tier):
    """A forward module's well gets the warm key light on its object; a quiet one sits darker."""
    if tier == 'forward':
        m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).ellipse((w // 2 - 62, 6, w // 2 + 62, h + 14), fill=54)
        lay = Image.new('RGBA', (w, h), (255, 228, 190, 0)); lay.putalpha(m.filter(ImageFilter.GaussianBlur(14)))
        clip = Image.new('L', (w, h), 0); ImageDraw.Draw(clip).rounded_rectangle((0, 0, w - 1, h - 1), 6, fill=255)
        lay.putalpha(ImageChops.multiply(lay.getchannel('A'), clip))
        im.alpha_composite(lay, (x, y))


def place(im, obj, cx, base, tier, shadow_w=None):
    cx, base = int(round(cx)), int(round(base))
    k = {'forward': 1.18, 'live': 1.0, 'quiet': 1.0}[tier]
    if k != 1:
        obj = obj.resize((round(obj.width * k), round(obj.height * k)), Image.LANCZOS)
    if tier == 'quiet':
        obj = shade(obj, 0.55)
    sw = shadow_w or obj.width
    sh = contact(sw, 8, 0.55 if tier != 'quiet' else 0.35)
    im.alpha_composite(sh, (cx - sh.width // 2, base - sh.height // 2 - 1))
    im.alpha_composite(obj, (cx - obj.width // 2, base - obj.height))


def module(im, d, k, name, tier, content):
    x, y, w, h = 688, 48 + k * 102, 320, 94
    pane(d, x, y, w, h)
    d.text((x + 16, y + 14), name, font=F16, fill=C['bone'] if tier != 'quiet' else C['fog'])
    lx, ly = x + w - 26, y + 14
    if tier == 'forward' or content.get('lamp'):
        im.alpha_composite(src('home-lamp-amber-12x12.png'), (lx, ly))
    else:
        d.ellipse((lx + 2, ly + 2, lx + 10, ly + 10), fill=C['night'], outline=C['hairline'])
    wx, wy, ww, wh = x + WELL[0], y + WELL[1], WELL[2], WELL[3]
    d.rounded_rectangle((wx, wy, wx + ww - 1, wy + wh - 1), 6, fill=(22, 27, 34) if tier != 'quiet' else (20, 24, 30))
    d.line((wx + 6, wy + wh - 1, wx + ww - 7, wy + wh - 1), fill=C['bevel'])        # the well's lit lower lip
    well_light(im, wx, wy, ww, wh, tier)
    cx, base = wx + ww // 2, wy + wh - 8
    kind = content['kind']
    if kind == 'cargo':                      # the bay: its back wall, the crates on its floor
        d.rectangle((wx + 24, wy + 8, wx + ww - 25, wy + 24), fill=(14, 17, 22))
        for i in range(3):
            d.line((wx + 24, wy + 8 + i * 4, wx + ww - 25, wy + 8 + i * 4), fill=(52, 58, 66))
        n = content.get('crates', 0)
        c = src('crate-sitting-48x40.png')
        for i in range(n):
            place(im, c, cx + (i - (n - 1) / 2) * (66 if tier == 'forward' else 56), base, tier)
    elif kind == 'pods':                     # the case: three wells, the species' own shells
        for i, code in enumerate(content.get('pods', [])):
            px = cx + (i - 1) * 50
            d.ellipse((px - 20, base - 8, px + 20, base + 4), fill=(14, 17, 22))
            place(im, species_pod(code).resize((34, 43), Image.LANCZOS), px, base, tier)
    elif kind == 'incubator':                # the candling chamber, its ring
        st = content.get('state', 'empty')
        r = 70 if tier == 'forward' else 60
        ry = wy + (wh - r) // 2
        im.alpha_composite(ring(r, {'empty': 0, 'growing': 0.55, 'ready': 1.0}[st]), (cx - r // 2, ry))
        if st != 'empty':
            pod = species_pod('S01').resize((30, 38) if tier != 'forward' else (38, 48), Image.LANCZOS)
            a = np.asarray(pod, dtype=float)
            yy = np.linspace(0, 1, a.shape[0])[:, None, None] ** 1.3
            lift = 0.75 if st == 'ready' else 0.45
            a[..., :3] = a[..., :3] + (np.array([226, 252, 242]) - a[..., :3]) * (lift * yy)
            pod = Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA')
            if tier == 'quiet':
                pod = shade(pod, 0.6)
            im.alpha_composite(pod, (cx - pod.width // 2, ry + r // 2 - pod.height // 2 + 2))
    elif kind == 'probe':
        place(im, src('bench-probe-upright-t1-288x432.png').resize((44, 66), Image.LANCZOS), cx, base, tier)
    elif kind == 'library':
        place(im, book().resize((44, 59), Image.LANCZOS), cx, base, tier)


def home(state_src, cfg, out, label):
    base = src(state_src)
    im = Image.new('RGBA', (1024, 600), C['ground'] + (255,))
    im.alpha_composite(base)
    d = ImageDraw.Draw(im)
    d.rectangle((676, 40, 1023, 561), fill=C['ground'])
    for k, (name, tier, content) in enumerate(cfg):
        module(im, d, k, name, tier, content)
    d.text((24, 532), label, font=F13, fill=C['fog'])
    im.convert('RGB').save(os.path.join(OUT, out), optimize=True)
    print(out)
    return im


A = home('home-docked.png', [
    ('Cargo', 'forward', {'kind': 'cargo', 'crates': 2}),
    ('Pods', 'quiet', {'kind': 'pods', 'pods': ['S01', 'S03', 'S05']}),
    ('Incubator', 'live', {'kind': 'incubator', 'state': 'growing'}),
    ('Probe', 'quiet', {'kind': 'probe'}),
    ('Library', 'quiet', {'kind': 'library'})], 'home-crates-waiting.png', 'Home · crates waiting: Cargo forward, the bud growing live · concept')
B = home('home-incubator-ready.png', [
    ('Cargo', 'quiet', {'kind': 'cargo', 'crates': 0}),
    ('Pods', 'quiet', {'kind': 'pods', 'pods': ['S01', 'S03', 'S05']}),
    ('Incubator', 'forward', {'kind': 'incubator', 'state': 'ready'}),
    ('Probe', 'quiet', {'kind': 'probe'}),
    ('Library', 'quiet', {'kind': 'library'})], 'home-bud-ready.png', 'Home · a bud ready: the Incubator forward · concept')
Cq = home('home-goal-docked.png', [
    ('Cargo', 'quiet', {'kind': 'cargo', 'crates': 0}),
    ('Pods', 'quiet', {'kind': 'pods', 'pods': ['S01', 'S03', 'S05']}),
    ('Incubator', 'quiet', {'kind': 'incubator', 'state': 'empty'}),
    ('Probe', 'quiet', {'kind': 'probe'}),
    ('Library', 'quiet', {'kind': 'library'})], 'home-nothing-waiting.png', 'Home · nothing waiting: the window leads, the column at rest · concept')

# the device-sheet view: each state beside the screen its forward module opens
sheet = Image.new('RGB', (2 * 1024 + 48, 3 * 600 + 4 * 40), C['void'])
dd = ImageDraw.Draw(sheet)
rows = [(A, 'C2-crate-by-crate.png', 'crates waiting  →  ✓ Open the bay  →  Cargo (T-171)'),
        (B, 'incubator-candling-s03.png', 'a bud ready  →  ✓ Go to the Incubator  →  the Incubator (T-169)'),
        (Cq, None, 'nothing waiting  →  the window leads; no module forward')]
for r, (h, nxt, lab) in enumerate(rows):
    y = 40 + r * 640
    dd.text((16, y - 30), lab, font=F16, fill=C['bone'])
    sheet.paste(h.convert('RGB'), (16, y))
    if nxt:
        sheet.paste(src(nxt).convert('RGB'), (16 + 1024 + 16, y))
sheet.save(os.path.join(OUT, 'device-sheet-home-column.png'), optimize=True)
print('device-sheet-home-column.png')
