#!/usr/bin/env python3
"""T-20261016-192, round 2: one face. The living window and the modules are recesses cut into one slate face of the
machine, in fixed places and of unequal sizes, each the shape of what it holds; no labels, no boxes in boxes.
Forward: the recess lit from within, its object brought forward, its amber lamp on that recess. Live: at rest, unlit,
its ring running (only forward is lit; that is what tells growing from ready).
Quiet: at rest (the bay door shut, the chamber empty and dark). Composited from signed art; no generated pixels.

  python3 make-column-v2.py SRC FONTS OUT
"""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

SRC, FONTS, OUT = sys.argv[1:4]
C = {'void': (12, 10, 18), 'ground': (29, 35, 43), 'bar': (35, 41, 47), 'hairline': (61, 67, 75), 'bevel': (86, 92, 99),
     'bone': (241, 235, 223), 'fog': (198, 196, 216), 'mint': (173, 246, 224), 'tealD': (15, 76, 80), 'night': (41, 37, 58)}
F13 = ImageFont.truetype(os.path.join(FONTS, 'Inter-Regular.ttf'), 13)
src = lambda n: Image.open(os.path.join(SRC, n)).convert('RGBA')


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


def book():
    h = src('home-docked.png'); lib = h.crop((826, 472, 878, 542))
    a = np.asarray(lib).copy(); a[(np.abs(a[..., :3].astype(int) - [54, 46, 40]).max(axis=2) <= 12), 3] = 0
    return Image.fromarray(a, 'RGBA')


def face(w, h):
    """The machine's slate face: matte, lit from the top left, a slight wear toward the edges."""
    yy, xx = np.mgrid[0:h, 0:w]
    t = (xx / w * 0.35 + yy / h * 0.65)
    base = np.array([58, 64, 72]) * (1 - t[..., None]) + np.array([38, 43, 50]) * t[..., None]
    rng = np.random.default_rng(7)
    base += rng.normal(0, 1.2, (h, w, 1))
    return Image.fromarray(np.clip(base, 0, 255).astype('uint8'), 'RGB').convert('RGBA')


def recess(im, box, r, shape='round'):
    """Cut a recess into the face: dark interior, a shadow under its top and left edges, a lit lower lip."""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    m = Image.new('L', (w, h), 0); dm = ImageDraw.Draw(m)
    if shape == 'arch':
        dm.rounded_rectangle((0, w // 2, w - 1, h - 1), r, fill=255); dm.ellipse((0, 0, w - 1, w - 1), fill=255)
    elif shape == 'circle':
        dm.ellipse((0, 0, w - 1, h - 1), fill=255)
    else:
        dm.rounded_rectangle((0, 0, w - 1, h - 1), r, fill=255)
    inner = Image.new('RGBA', (w, h), (16, 19, 25, 255)); inner.putalpha(m)
    im.alpha_composite(inner, (x0, y0))
    sh = ImageChops.subtract(m, m.transform(m.size, Image.AFFINE, (1, 0, -5, 0, 1, -6))).filter(ImageFilter.GaussianBlur(4))
    sl = Image.new('RGBA', (w, h), (0, 0, 0, 0)); sl.putalpha(ImageChops.multiply(sh, m).point(lambda v: int(v * 0.8)))
    im.alpha_composite(sl, (x0, y0))
    lip = ImageChops.subtract(m.transform(m.size, Image.AFFINE, (1, 0, 0, 0, 1, -1)), m)
    ll = Image.new('RGBA', (w, h), C['bevel'] + (0,)); ll.putalpha(lip.point(lambda v: int(v * 0.9)))
    im.alpha_composite(ll, (x0, y0 + 1))
    return m


def light_in(im, box, mask):
    """The forward recess, lit from within: a warm pool on its floor, a soft rise up its walls."""
    x0, y0, x1, y1 = box; w, h = x1 - x0, y1 - y0
    p = Image.new('L', (w, h), 0); ImageDraw.Draw(p).ellipse((w * 0.12, h * 0.45, w * 0.88, h * 1.15), fill=78)
    p = ImageChops.multiply(p.filter(ImageFilter.GaussianBlur(max(6, h // 5))), mask)
    lay = Image.new('RGBA', (w, h), (255, 222, 178, 0)); lay.putalpha(p)
    im.alpha_composite(lay, (x0, y0))


def lamp(im, d, x, y, lit):
    if lit:
        im.alpha_composite(src('home-lamp-amber-12x12.png'), (x, y))
    else:
        d.ellipse((x + 2, y + 2, x + 10, y + 10), fill=C['night'], outline=C['hairline'])


def ring_arc(size, frac, thick=5):
    k = 8
    im = Image.new('RGBA', (size * k, size * k), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    b = (thick * k // 2, thick * k // 2, (size - thick // 2) * k, (size - thick // 2) * k)
    d.arc(b, 180, 360, fill=C['tealD'], width=thick * k)
    if frac:
        d.arc(b, 180, 180 + 180 * frac, fill=C['mint'], width=thick * k)
    return im.resize((size, size), Image.LANCZOS)


def home(state_src, st, out, label):
    im = Image.new('RGBA', (1024, 600), C['ground'] + (255,))
    im.alpha_composite(src(state_src).crop((0, 0, 1024, 40)))
    im.alpha_composite(src(state_src).crop((0, 562, 1024, 600)), (0, 562))
    im.alpha_composite(face(1008 - 16, 552 - 44), (16, 44))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((16, 44, 1007, 551), 12, outline=C['hairline'])
    # the living window: the face's largest recess, its rubber bezel
    d.rounded_rectangle((22, 50, 668, 546), 12, fill=(30, 30, 33))
    win = src(state_src).crop((24, 56, 664, 544))
    wm = Image.new('L', win.size, 0); ImageDraw.Draw(wm).rounded_rectangle((0, 0, win.width - 1, win.height - 1), 8, fill=255)
    win.putalpha(wm); im.alpha_composite(win, (26, 54))
    # Cargo: the bay door (wide), top
    cb = (688, 60, 996, 168)
    cm = recess(im, cb, 10)
    if st['cargo'] == 'forward':
        light_in(im, cb, cm)
        d.rectangle((704, 66, 966, 82), fill=(56, 62, 70))                   # the shutter, rolled up
        for i in range(3): d.line((704, 66 + i * 6, 966, 66 + i * 6), fill=(84, 90, 98))
        c = src('crate-sitting-80x56.png')
        for i, x in enumerate((760, 852)):
            im.alpha_composite(contact(70, 10, 0.6), (x - 70 // 2 + 40 - 35, 152))
            im.alpha_composite(c, (x - 40 + 40 - 40 + 0, 104))
        lamp(im, d, 976, 66, True)                                           # the lamp on its own recess
    else:                                                                     # the door shut, at rest
        for i in range(12):
            y = 66 + i * 8
            d.rectangle((696, y, 966 if i < 2 else 988, y + 6), fill=(46, 52, 60)); d.line((696, y, 966 if i < 2 else 988, y), fill=(66, 72, 80))
        lamp(im, d, 976, 66, False)
    # Pods: three sockets cut straight into the face
    for i, code in enumerate(('S01', 'S03', 'S05')):
        sx = 716 + i * 96
        sb = (sx, 184, sx + 72, 268)
        sm = recess(im, sb, 30)
        p = species_pod(code).resize((50, 64), Image.LANCZOS)
        if st['pods'] == 'quiet':
            p = shade(p, 0.62)
        im.alpha_composite(contact(46, 8, 0.5), (sx + 13, 254))
        im.alpha_composite(p, (sx + 11, 196))
    # Incubator: the tall arched candling chamber, its rim the ring
    ib = (688, 284, 836, 546)
    imk = recess(im, ib, 14, 'arch')
    if st['inc'] == 'ready':                                                  # forward: lit from within, candled
        light_in(im, ib, imk)
        pool = Image.new('L', (148, 262), 0); ImageDraw.Draw(pool).ellipse((30, 200, 118, 250), fill=140)
        pl = Image.new('RGBA', (148, 262), (200, 250, 236, 0)); pl.putalpha(ImageChops.multiply(pool.filter(ImageFilter.GaussianBlur(8)), imk))
        im.alpha_composite(pl, (688, 284))
        pod = species_pod('S01').resize((66, 84), Image.LANCZOS)
        a = np.asarray(pod, dtype=float); yy = np.linspace(0, 1, a.shape[0])[:, None, None] ** 1.3
        a[..., :3] = a[..., :3] + (np.array([226, 252, 242]) - a[..., :3]) * (0.78 * yy)
        pod = Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA')
        im.alpha_composite(pod, (762 - pod.width // 2, 520 - pod.height))
        d.rounded_rectangle((742, 526, 782, 530), 2, fill=C['mint'])
        im.alpha_composite(ring_arc(140, 1.0), (692, 288))
        lamp(im, d, 820, 288, True)
    elif st['inc'] == 'growing':                                              # live: at rest, unlit, the ring running
        pod = shade(species_pod('S01').resize((58, 74), Image.LANCZOS), 0.62)
        im.alpha_composite(contact(52, 8, 0.5), (736, 516)); im.alpha_composite(pod, (762 - pod.width // 2, 520 - pod.height))
        d.rounded_rectangle((742, 526, 782, 530), 2, fill=C['hairline'])
        im.alpha_composite(ring_arc(140, 0.55), (692, 288))
        lamp(im, d, 820, 288, False)
    else:
        lamp(im, d, 820, 288, False)                                         # empty: dark, no ring
    # Probe: upright in its clamp
    pb = (852, 284, 996, 410)
    recess(im, pb, 12)
    pr = src('bench-probe-upright-t1-288x432.png').resize((60, 90), Image.LANCZOS)
    pr = shade(pr, 0.62) if st['probe'] == 'quiet' else pr
    im.alpha_composite(contact(54, 8, 0.5), (897, 394)); im.alpha_composite(pr, (894, 306))
    # Library: the journal in its slot
    lb = (852, 422, 996, 546)
    recess(im, lb, 12)
    bk = book().resize((56, 75), Image.LANCZOS)
    bk = shade(bk, 0.62) if st['lib'] == 'quiet' else bk
    im.alpha_composite(contact(52, 8, 0.5), (899, 530)); im.alpha_composite(bk, (896, 458))
    d.text((32, 528), label, font=F13, fill=C['fog'])
    im.convert('RGB').save(os.path.join(OUT, out), optimize=True)
    print(out)
    return im


Q = 'quiet'
A = home('home-docked.png', {'cargo': 'forward', 'pods': Q, 'inc': 'growing', 'probe': Q, 'lib': Q},
         'home-v2-crates-waiting.png', 'One face · crates waiting: the bay open and lit · concept')
B = home('home-incubator-ready.png', {'cargo': Q, 'pods': Q, 'inc': 'ready', 'probe': Q, 'lib': Q},
         'home-v2-bud-ready.png', 'One face · a bud ready: the chamber lit, its ring full · concept')
N = home('home-goal-docked.png', {'cargo': Q, 'pods': Q, 'inc': 'empty', 'probe': Q, 'lib': Q},
         'home-v2-nothing-waiting.png', 'One face · nothing waiting: the window leads, the face at rest · concept')

sheet = Image.new('RGB', (2 * 1024 + 48, 3 * 600 + 4 * 40), C['void']); dd = ImageDraw.Draw(sheet)
F16 = ImageFont.truetype(os.path.join(FONTS, 'Inter-Regular.ttf'), 16)
for r, (h, nxt, lab) in enumerate([(A, 'C2-crate-by-crate.png', 'crates waiting  →  ✓ Open the bay  →  Cargo (T-171)'),
                                   (B, 'incubator-candling-s03.png', 'a bud ready  →  ✓ Go to the Incubator  →  the Incubator (T-169)'),
                                   (N, None, 'nothing waiting  →  the window leads; no recess lit')]):
    y = 40 + r * 640
    dd.text((16, y - 30), lab, font=F16, fill=C['bone'])
    sheet.paste(h.convert('RGB'), (16, y))
    if nxt:
        sheet.paste(src(nxt).convert('RGB'), (16 + 1024 + 16, y))
sheet.save(os.path.join(OUT, 'device-sheet-home-v2.png'), optimize=True)
print('device-sheet-home-v2.png')
