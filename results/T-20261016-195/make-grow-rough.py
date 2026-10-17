#!/usr/bin/env python3
"""T-20261016-195, Grow: a structure rough after the owner's 13:17 ruling and the game designer's weights
(grow-structure.md). The founder is the subject of both windows, at the same scale (about 2/3 of the window's
height); the windows differ by setting. Grow it: the founder inside its own sealed pod, candled from below in the
chamber's light. Keep shaping: the founder on the bench under the work light, its genes open. Settings are blocked in
values only; the paint follows Home's direction (T-20261016-199).

  python3 make-grow-rough.py SRC FONTS OUT
"""
import os, sys
here = os.path.dirname(os.path.abspath(__file__))
r2 = open(os.path.join(here, 'make-r2.py')).read()
exec(r2[:r2.index('ret, keep = ')])  # T-170's helpers via make-r2.py, and the round-2 card and panel

W, H = 364, 312
FH = round(H * 0.66)                       # the founder's height in both windows


def founder():
    made = changed_light(src('rich-marked-300x310.png'), src('rich-plain-300x310.png'))   # their edits, in scan light
    made = made.crop(made.getbbox())
    return made.resize((round(made.width * FH / made.height), FH), Image.LANCZOS)


def rough_grow(w, h):
    """The chamber: dark around, the light rising from a lamp below; the pod's shell, sealed, wraps the founder at
    full size, translucent so the founder shows through it."""
    a = np.zeros((h, w, 3)) + np.array([22, 26, 32])
    yy, xx = np.mgrid[0:h, 0:w]
    glow = np.clip(1 - np.hypot((xx - w / 2) / (w * 0.55), (yy - h * 0.98) / (h * 0.85)), 0, 1) ** 1.6
    a = a + (np.array([150, 214, 196]) - a) * glow[..., None] * 0.55
    bg = Image.fromarray(a.astype('uint8'), 'RGB').convert('RGBA')
    f = founder()
    fx, fy = (w - f.width) // 2, h - 30 - f.height
    bg.alpha_composite(f, (fx, fy))
    pod = loika_pod(sealed=True)
    pod = pod.crop(pod.getbbox())
    ph = h - 14
    pod = pod.resize((round(pod.width * ph / pod.height * 1.05), ph), Image.LANCZOS)
    pa = np.asarray(pod, dtype=float)
    t = np.linspace(0, 1, pa.shape[0])[:, None, None] ** 1.5           # candled: lit through from the base
    pa[..., :3] = pa[..., :3] + (np.array([226, 252, 242]) - pa[..., :3]) * (0.55 * t)
    pa[..., 3] = pa[..., 3] * (0.30 + 0.12 * t[..., 0])                  # a shell you see the founder through
    pod = Image.fromarray(np.clip(pa, 0, 255).astype('uint8'), 'RGBA')
    bg.alpha_composite(pod, ((w - pod.width) // 2, 6))
    d = ImageDraw.Draw(bg)
    d.rounded_rectangle((w // 2 - 40, h - 12, w // 2 + 40, h - 7), 2, fill=C['mint'])   # the lamp below
    return bg


def rough_keep(w, h):
    """The bench: a lit work surface the founder stands on, the work light from the top left, the gene column open."""
    a = np.zeros((h, w, 3)) + np.array([34, 38, 45])
    yy, xx = np.mgrid[0:h, 0:w]
    bench = yy > h * 0.74
    a[bench] = np.array([70, 74, 80]) - (yy[bench][:, None] - h * 0.74) * 0.35
    cone = np.clip(1 - np.hypot(xx / (w * 0.9), yy / (h * 1.1)), 0, 1) ** 1.3
    a = a + (np.array([255, 232, 200]) - a) * cone[..., None] * 0.35
    bg = Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGB').convert('RGBA')
    d = ImageDraw.Draw(bg)
    d.line((0, int(h * 0.74), w, int(h * 0.74)), fill=(96, 100, 106))
    f = founder()
    fx, fy = (w - 96 - f.width) // 2, h - 30 - f.height
    sh = contact(round(f.width * 0.45), 12, 0.6)
    bg.alpha_composite(sh, (fx + f.width // 2 - sh.width // 2, fy + f.height - sh.height // 2 - 2))
    bg.alpha_composite(f, (fx, fy))
    genes = ['genome-gene-open-lit-40x40.png', 'genome-gene-open-40x40.png', 'genome-gene-only-40x40.png',
             'genome-gene-open-40x40.png', 'genome-gene-open-40x40.png']
    for n, g in enumerate(genes):                                         # the genes, open, in a column at the right
        gx, gy = w - 66, 22 + n * 54
        d.rounded_rectangle((gx - 4, gy - 4, gx + 47, gy + 47), 6, fill=C['ground'], outline=C['hairline'])
        bg.alpha_composite(src(g).resize((44, 44), Image.LANCZOS), (gx, gy))
    return bg


grow, shape = rough_grow(W, H), rough_keep(W, H)
gp = grow_price()
out = {}
for cov in (False, True):
    sfx = '-covered' if cov else ''
    out[cov] = panel_r2([(grow, 'Grow it', gp, None, True), (shape, 'Keep shaping', None, None, False)],
                        'create-shape.png', 'grow-rough%s.png' % sfx, 'Grow · structure rough, values only', 'Grow it', gp,
                        stage=False, covered=cov)
