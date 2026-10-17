#!/usr/bin/env python3
"""T-20261016-170: the decision panel concepts on the shared slate pane (style guide §4 Pane, Decision panel,
Option card; §2 palette; §3 light). Composited by hand from accepted art; no generated pixels.

  python3 make-p1.py SRC FONTS OUT

SRC: masters-pods sitting-backdrop-pond-544x408, the motion keys pip-anchor/pip-curl-304x312; station-gate
vivarium-near-dusk-544x408, rich-plain/rich-marked-300x310, frame caps, the pod-collection layers and species-S01.json; the device sheet's goldens
habitat-rest, create-shape, home-docked (for the top bars and the material icons).
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import numpy as np

SRC, FONTS, OUT = sys.argv[1:4]
C = {'void': (12, 10, 18), 'ground': (29, 35, 43), 'bar': (35, 41, 47), 'panel': (43, 48, 56), 'hairline': (61, 67, 75),
     'bevel': (86, 92, 99), 'bone': (241, 235, 223), 'fog': (198, 196, 216), 'mist': (141, 138, 166), 'mint': (173, 246, 224),
     'tealD': (15, 76, 80), 'aqua': (69, 216, 190), 'orange': (242, 103, 27), 'focus': (255, 230, 173), 'coral': (255, 95, 87),
     'red': (201, 52, 64)}
F = lambda w, s: ImageFont.truetype(os.path.join(FONTS, 'Inter-%s.ttf' % w), s)
F16, F20, F16M = F('Regular', 16), F('Medium', 20), F('Medium', 16)
src = lambda n: Image.open(os.path.join(SRC, n)).convert('RGBA')


def key_out(img, col, tol=6):
    a = np.asarray(img).copy()
    m = (np.abs(a[..., :3].astype(int) - col).max(axis=2) <= tol)
    a[m, 3] = 0
    return Image.fromarray(a, 'RGBA')


def pane(d, x, y, w, h, r=8, fill='panel'):
    d.rounded_rectangle((x, y, x + w - 1, y + h - 1), r, fill=C[fill], outline=C['hairline'])
    d.line((x + r, y + 1, x + w - r - 1, y + 1), fill=C['bevel'])
    d.line((x + 1, y + r, x + 1, y + h - r - 1), fill=C['bevel'])
    d.arc((x + 1, y + 1, x + 2 * r, y + 2 * r), 180, 270, fill=C['bevel'])


def grade(img, top, bottom, strength):
    """A vertical light grade multiplied over a painting (the scene's light, not a glow)."""
    w, h = img.size
    g = np.linspace(0, 1, h)[:, None, None]
    col = (np.array(top) * (1 - g) + np.array(bottom) * g) / 255
    a = np.asarray(img.convert('RGB'), dtype=float) / 255
    out = a * (1 - strength) + a * col * strength * 1.6
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype('uint8'), 'RGB').convert('RGBA')


def figure(name, scale, flip=False, warm=None):
    f = src(name)
    bb = f.getbbox()
    f = f.crop(bb)
    f = f.resize((round(f.width * scale), round(f.height * scale)), Image.LANCZOS)
    if flip:
        f = f.transpose(Image.FLIP_LEFT_RIGHT)
    if warm:  # the scene's light on the figure: a multiply toward the light colour
        a = np.asarray(f, dtype=float)
        a[..., :3] = a[..., :3] * (1 - warm[1]) + a[..., :3] * np.array(warm[0]) / 255 * warm[1]
        f = Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA')
    return f


def contact(w, h, alpha=0.55):
    s = Image.new('L', (w * 2, h * 2), 0)
    ImageDraw.Draw(s).ellipse((w // 2, h // 2, w * 3 // 2, h * 3 // 2), fill=int(255 * alpha))
    s = s.filter(ImageFilter.GaussianBlur(h / 3))
    out = Image.new('RGBA', s.size, (16, 14, 20, 0))
    out.putalpha(s)
    return out


# ------------------------------------------------------------------ the outcome scenes
def scene_return(w, h):
    """Return: Pip small at its pond edge at dusk, heading out along the bank with his face turned back once;
    his footprints lead away from us. The whole pond edge in frame: reeds, the far bank, water, a low warm sky."""
    k = w / 544
    bg = src('sitting-backdrop-pond-544x408.png').resize((w, round(408 * k)), Image.LANCZOS)
    bg = bg.crop((0, bg.height - h, w, bg.height))
    bg = grade(bg, (110, 100, 160), (255, 172, 116), 0.6)
    prints = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(prints)
    pts = [(0.12, 0.93), (0.22, 0.87), (0.31, 0.82), (0.39, 0.78), (0.46, 0.75), (0.52, 0.725)]
    for i, (fx, fy) in enumerate(pts):
        x, y, r = w * fx, h * fy, max(1.3, 3.2 - i * 0.35)
        for dx in (-r * 1.5, r * 1.5):
            d.ellipse((x + dx - r, y - r * 0.5, x + dx + r, y + r * 0.5), fill=(70, 52, 40, 110))
    bg.alpha_composite(prints.filter(ImageFilter.GaussianBlur(0.7)))
    pip = figure('pip-anchor-304x312.png', 0.2 * w / 364, flip=True, warm=((255, 186, 140), 0.28))
    px, py = int(w * 0.56), int(h * 0.71) - pip.height + 4
    sh = contact(pip.width, 8, 0.45)
    bg.alpha_composite(sh, (px + pip.width // 2 - sh.width // 2, py + pip.height - sh.height // 2 - 2))
    bg.alpha_composite(pip, (px, py))
    return bg


def scene_keep(w, h):
    """Keep: Pip curled asleep in its bay beside the burrow, big and close, in the vivarium's warm light."""
    bg = src('vivarium-near-dusk-544x408.png')
    bg = bg.resize((round(544 * 1.25), round(408 * 1.25)), Image.LANCZOS).crop((20, 190, 20 + w, 190 + h))
    pip = figure('pip-curl-304x312.png', 0.86)
    px, py = (w - pip.width) // 2 + 34, h - pip.height - 6
    sh = contact(pip.width, 24, 0.6)
    bg.alpha_composite(sh, (px + pip.width // 2 - sh.width // 2, py + pip.height - sh.height // 2 - 6))
    bg.alpha_composite(pip, (px, py))
    return bg


def scene_grow(w, h):
    """Grow it: the founder you made, standing in the bench's scanning recess, lit; the parts you changed catch
    the scan light (mint). The pod, sealed in its ring, goes to the Incubator."""
    bg = Image.new('RGBA', (w, h), C['ground'] + (255,))
    pool = Image.new('L', (w, h), 0)
    ImageDraw.Draw(pool).ellipse((w // 2 - 150, -40, w // 2 + 70, h - 10), fill=46)
    light = Image.new('RGBA', (w, h), (255, 236, 210, 0)); light.putalpha(pool.filter(ImageFilter.GaussianBlur(40)))
    bg.alpha_composite(light)
    made, plain = src('rich-marked-300x310.png'), src('rich-plain-300x310.png')
    diff = np.abs(np.asarray(made, dtype=int)[..., :3] - np.asarray(plain, dtype=int)[..., :3]).max(axis=2) > 40
    m = Image.fromarray((diff * 255).astype('uint8')).filter(ImageFilter.MaxFilter(3))
    edge = ImageChops.subtract(m, m.filter(ImageFilter.MinFilter(3)))
    a = np.asarray(made, dtype=float)
    e = np.asarray(edge, dtype=float)[..., None] / 255 * 0.7
    a[..., :3] = a[..., :3] * (1 - e) + np.array(C['mint']) * e
    made = Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA').crop(made.getbbox())
    made = made.resize((round(made.width * 0.72), round(made.height * 0.72)), Image.LANCZOS)
    px, py = (w - made.width) // 2 - 40, h - made.height - 14
    sh = contact(made.width, 18, 0.65)
    bg.alpha_composite(sh, (px + made.width // 2 - sh.width // 2, py + made.height - sh.height // 2 - 4))
    bg.alpha_composite(made, (px, py))
    return bg


def scene_shape(w, h):
    """Keep shaping: the pod's own founder, plain, on the bench, under the bench's quiet light; nothing changes."""
    bg = Image.new('RGBA', (w, h), C['ground'] + (255,))
    plain = src('rich-plain-300x310.png')
    plain = plain.crop(plain.getbbox())
    plain = plain.resize((round(plain.width * 0.62), round(plain.height * 0.62)), Image.LANCZOS)
    a = np.asarray(plain, dtype=float); a[..., :3] *= 0.82
    plain = Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA')
    px, py = (w - plain.width) // 2, h - plain.height - 22
    sh = contact(plain.width, 16, 0.5)
    bg.alpha_composite(sh, (px + plain.width // 2 - sh.width // 2, py + plain.height - sh.height // 2 - 4))
    bg.alpha_composite(plain, (px, py))
    return bg


def loika_pod(sealed=True):
    """The Loika's own shell from the pod renderer's signed layers (ui/podlayers.mjs composePod, ported), sealed."""
    import json
    pod = json.load(open(os.path.join(SRC, 'species-S01.json')))['pod']
    ld = lambda n: np.asarray(src('pod-collection-%s.png' % n), dtype=float) / 255
    sh, bd, ac, pt = ld('shade'), ld('mask-body')[..., 3], ld('mask-accent')[..., 3], ld('pattern-dots')[..., 3]
    A, B = [np.array([int(c['hex'][i:i + 2], 16) / 255 for i in (1, 3, 5)]) for c in pod['colourPair']]
    rgb = np.minimum(1, (A * (bd * (1 - pt))[..., None] + B * np.minimum(1, ac + pt)[..., None]) * sh[..., :1] * 2)
    out = Image.fromarray((np.dstack([rgb, sh[..., 3:4]]) * 255).round().astype('uint8'), 'RGBA')
    if sealed:
        out.alpha_composite(src('pod-collection-band.png'))
    return out


def ring_inset(size=64, frac=0.0):
    k = 8
    im = Image.new('RGBA', (size * k, size * k), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    b = (4 * k, 4 * k, (size - 4) * k, (size - 4) * k)
    d.arc(b, 135, 405, fill=C['tealD'], width=5 * k)
    if frac:
        d.arc(b, 135, 135 + 270 * frac, fill=C['mint'], width=5 * k)
    return im.resize((size, size), Image.LANCZOS)


# ------------------------------------------------------------------ the frame
def screen(topbar_from, title, stage=True):
    im = Image.new('RGBA', (1024, 600), C['ground'] + (255,))
    if topbar_from:
        base = src(topbar_from)
        im.alpha_composite(base if stage else base.crop((0, 0, 1024, 40)))
        if stage:
            veil = Image.new('RGBA', (1024, 522), C['ground'] + (166,))
            im.alpha_composite(veil, (0, 40))
    d = ImageDraw.Draw(im)
    d.rectangle((0, 562, 1023, 599), fill=C['bar'])
    d.line((0, 562, 1023, 562), fill=C['void'])
    return im, d


def bottom(im, d, verb, price=None, context=''):
    im.alpha_composite(src('frame-cap-confirm-16.png'), (16, 574))
    d.text((36, 572), verb, font=F16, fill=C['orange'])
    x = 36 + F16.getlength(verb) + 24
    if price is not None:
        im.alpha_composite(price, (int(x), 570))
    if context:
        d.text((512, 582), context, font=F16, fill=C['mist'], anchor='mm')
    im.alpha_composite(src('frame-cap-back-16.png'), (int(1008 - 4 - F16.getlength('Back') - 16), 574))
    d.text((1008, 582), 'Back', font=F16, fill=C['fog'], anchor='rm')


def label(d, s):
    d.text((16, 530), s, font=F16, fill=C['fog'])


def card(im, d, x, y, w, scene, verb, cost, line, loss, focused):
    pane(d, x, y, w, 352, 8, 'ground')
    im.alpha_composite(scene, (x + 8, y + 8))
    d.rounded_rectangle((x + 8, y + 8, x + 8 + scene.width - 1, y + 8 + scene.height - 1), 4, outline=C['hairline'])
    d.text((x + 16, y + 264), verb, font=F20, fill=C['bone'])
    if cost is not None:
        im.alpha_composite(cost, (x + w - 16 - cost.width, y + 266))
    d.text((x + 16, y + 300), line, font=F16, fill=C['coral'] if loss else C['fog'])
    if loss:  # the loss mark: the cross beside its words
        cx = x + 16 + int(F16.getlength(line)) + 10
        d.ellipse((cx, y + 301, cx + 15, y + 316), fill=C['red'])
        d.line((cx + 4, y + 305, cx + 11, y + 312), fill=(255, 255, 255), width=2)
        d.line((cx + 11, y + 305, cx + 4, y + 312), fill=(255, 255, 255), width=2)
    if focused:
        d.rounded_rectangle((x - 4, y - 4, x + w + 3, y + 355), 12, outline=C['focus'], width=2)


def essence_plus2():
    ico = key_out(src('home-docked.png').crop((552, 10, 568, 26)), C['bar'], 10)
    im = Image.new('RGBA', (52, 20), (0, 0, 0, 0))
    im.alpha_composite(ico, (0, 2))
    ImageDraw.Draw(im).text((20, 0), '+2', font=F16, fill=C['mint'])
    return im


def grow_price():
    return key_out(src('create-shape.png').crop((112, 568, 192, 592)), C['bar'], 8)


def panel_p1(scenes, title, cards, topbar, out, lab, bottom_args, stage=True):
    im, d = screen(topbar, title, stage)
    label(d, lab)
    pane(d, 92, 80, 840, 440, 12, 'panel')
    d.text((512, 112), title, font=F20, fill=C['bone'], anchor='mm')
    for i, (sc, verb, cost, line, loss, foc) in enumerate(cards):
        card(im, d, 124 + i * 396, 152, 380, sc, verb, cost, line, loss, foc)
    bottom(im, d, *bottom_args)
    im.convert('RGB').save(os.path.join(OUT, out), optimize=True)
    print(out)


W, H = 364, 240
ret, keep = scene_return(W, H), scene_keep(W, H)
panel_p1(None, 'Return Pip?', [(ret, 'Return it', essence_plus2(), 'Gone for good. Its place will remember it.', True, False),
                               (keep, 'Keep Pip', None, 'Stays with you.', False, True)],
         'habitat-rest.png', 'P1-return.png', 'P1 · two windows · Return to the wild · concept, composited from accepted art',
         ('Keep Pip', None, 'Stays with you.'))

grow, shape = scene_grow(W, H), scene_shape(W, H)
gp = grow_price()
gi = grow.copy()
gi.alpha_composite(ring_inset(72, 0.0), (W - 88, H - 88))
gi.alpha_composite(loika_pod().resize((34, 43), Image.LANCZOS), (W - 88 + 19, H - 88 + 15))
panel_p1(None, 'Grow this founder?', [(gi, 'Grow it', gp, 'The pod is used.', False, True),
                                      (shape, 'Keep shaping', None, 'Nothing is spent.', False, False)],
         'create-shape.png', 'P1-grow.png', "P1's shared look · Grow it · concept, composited from accepted art",
         ('Grow it', gp, 'The pod is used.'), stage=False)

# P2: one scene, two halves
im, d = screen('habitat-rest.png', 'Return Pip?')
label(d, 'P2 · one scene, two halves · Return to the wild · concept, composited from accepted art')
pane(d, 92, 80, 840, 440, 12, 'panel')
d.text((512, 112), 'Return Pip?', font=F20, fill=C['bone'], anchor='mm')
pane(d, 124, 152, 776, 352, 8, 'ground')
L, R = scene_return(380, 240), scene_keep(380, 240)
both = Image.new('RGBA', (760, 240))
both.alpha_composite(L, (0, 0)); both.alpha_composite(R, (380, 0))
dim = Image.new('RGBA', (380, 240), C['ground'] + (130,))
both.alpha_composite(dim, (0, 0))   # the unfocused half, dimmed (Keep is focused)
im.alpha_composite(both, (132, 160))
d.line((132 + 380, 160, 132 + 380, 399), fill=C['hairline'])
d.text((140, 416), 'Return it', font=F20, fill=C['bone'])
im.alpha_composite(essence_plus2(), (132 + 380 - 16 - 52, 418))
d.text((140, 452), 'Gone for good. Its place will remember it.', font=F16, fill=C['coral'])
cx = 140 + int(F16.getlength('Gone for good. Its place will remember it.')) + 10
d.ellipse((cx, 453, cx + 15, 468), fill=C['red'])
d.line((cx + 4, 457, cx + 11, 464), fill=(255, 255, 255), width=2)
d.line((cx + 11, 457, cx + 4, 464), fill=(255, 255, 255), width=2)
d.text((528, 416), 'Keep Pip', font=F20, fill=C['bone'])
d.text((528, 452), 'Stays with you.', font=F16, fill=C['fog'])
d.rounded_rectangle((132 + 380 - 2, 156, 132 + 760 + 3, 504), 10, outline=C['focus'], width=2)
bottom(im, d, 'Keep Pip', None, 'Stays with you.')
im.convert('RGB').save(os.path.join(OUT, 'P2-return.png'), optimize=True)
print('P2-return.png')
