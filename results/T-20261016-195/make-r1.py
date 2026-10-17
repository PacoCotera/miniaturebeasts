#!/usr/bin/env python3
"""T-20261016-195, round 1: Return and Grow as options of equal standing, the pictures carrying the meaning.
Reuses T-170's pane, card and price code (results/T-20261016-170/make-p1.py); composited from accepted art, no
generated pixels.

  python3 make-r1.py SRC FONTS OUT

SRC adds to T-170's: place-pond-32x32 (masters-pods slices), frame-room-vivarium-24 (station-gate masters).
"""
import os, sys
here = os.path.dirname(os.path.abspath(__file__))
p1 = open(os.path.join(here, '..', 'T-20261016-170', 'make-p1.py')).read()
exec(p1[:p1.index('W, H = 364, 240')])  # T-170's definitions only, not its outputs

W, H = 364, 280


def daylight(img, strength=0.22):
    """The one warm daylight from the top left, the same on both windows: a soft warm rise, no grade to dusk."""
    w, h = img.size
    yy, xx = np.mgrid[0:h, 0:w]
    k = np.clip(1.15 - np.hypot(xx / w, yy / h * 1.2), 0, 1)[..., None] * strength
    a = np.asarray(img.convert('RGB'), dtype=float)
    a = a + (np.array([255, 236, 200]) - a) * k
    return Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGB').convert('RGBA')


def scene_return_home(w, h):
    """Return: Pip home at its pond, bounding along a mossy bank toward two of its own kind, under open sky, in daylight."""
    sky = src('sitting-backdrop-pond-544x408.png')
    k = (h + 40) / 408
    sky = sky.resize((round(544 * k), h + 40), Image.LANCZOS).crop((0, 40, w, h + 40))  # the water band in view
    a = np.asarray(sky.convert('RGB'), dtype=float)  # its own light: clear water, a bright sky, not a grey dusk
    lum = a.mean(axis=2, keepdims=True)
    a = lum + (a - lum) * 1.35
    a = a * 1.08 + 6
    sky = Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGB').convert('RGBA')
    bank = src('vivarium-near-day-544x408.png').crop((0, 262, 544, 408))  # the same moss and stones as home
    bank = bank.resize((w, round(146 * w / 544)), Image.LANCZOS)
    m = Image.new('L', bank.size, 0)
    md = ImageDraw.Draw(m)
    pts = [(0, 30)] + [(x, 22 + 10 * np.sin(x / 23.0) + 6 * np.sin(x / 9.0)) for x in range(0, w + 1, 6)] + [(w, bank.height), (0, bank.height)]
    md.polygon(pts, fill=255)
    bank.putalpha(m.filter(ImageFilter.GaussianBlur(3)))
    sky.alpha_composite(bank, (0, h - bank.height))
    sky = daylight(sky)
    # its own kind, already there: two wild Loikas further along the bank, smaller with distance, facing Pip
    for name, sc, fx, flip in (('rich-marked-300x310.png', 0.25, 0.70, True), ('rich-plain-300x310.png', 0.21, 0.86, True)):
        f = figure(name, sc, flip=flip)
        x, y = int(w * fx) - f.width // 2, h - 62 - f.height
        sh = contact(round(f.width * 0.8), 8, 0.45)
        sky.alpha_composite(sh, (x + f.width // 2 - sh.width // 2, y + f.height - sh.height // 2 - 1))
        sky.alpha_composite(f, (x, y))
    pip = src('pip-air-304x312.png').transpose(Image.FLIP_LEFT_RIGHT)  # bounding toward them (body and shadow, feet row 305)
    pip = pip.resize((round(304 * 0.5), round(312 * 0.5)), Image.LANCZOS)
    px, py = int(w * 0.06), h - 22 - round(305 * 0.5)
    sky.alpha_composite(pip, (px, py))
    return sky


def scene_keep_home(w, h):
    """Keep: Pip in its vivarium, the same scale, the same daylight, awake: home with you."""
    bg = src('vivarium-near-day-544x408.png')
    bg = bg.resize((round(544 * 1.1), round(408 * 1.1)), Image.LANCZOS).crop((10, 449 - h, 10 + w, 449))
    bg = daylight(bg)
    pip = src('pip-anchor-304x312.png').resize((round(304 * 0.5), round(312 * 0.5)), Image.LANCZOS)  # the same scale
    px, py = (w - pip.width) // 2 + 20, h - 30 - round(305 * 0.5)
    sh = contact(round(pip.width * 0.7), 14, 0.55)
    bg.alpha_composite(sh, (px + pip.width // 2 - sh.width // 2, py + round(305 * 0.5) - sh.height // 2 - 2))
    bg.alpha_composite(pip, (px, py))
    return bg


def icon_row(items):
    """Icons before figures (guide §4): where it goes, and any gain or cost, no sentence."""
    im = Image.new('RGBA', (200, 24), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x = 0
    for it in items:
        if isinstance(it, Image.Image):
            im.alpha_composite(it, (x, (24 - it.height) // 2))
            x += it.width + 10
    return im.crop((0, 0, max(1, x - 10), 24))


def place_mark(name, size=20):
    m = src(name)
    if m.width != size:
        m = m.resize((size, size), Image.LANCZOS)
    r = Image.new('L', (size, size), 0)
    ImageDraw.Draw(r).rounded_rectangle((0, 0, size - 1, size - 1), 4, fill=255)
    m.putalpha(ImageChops.multiply(m.getchannel('A'), r))
    return m


def card2(im, d, x, y, w, scene, verb, icons, focused, covered):
    pane(d, x, y, w, 352, 8, 'ground')
    im.alpha_composite(scene, (x + 8, y + 8))
    d.rounded_rectangle((x + 8, y + 8, x + 8 + scene.width - 1, y + 8 + scene.height - 1), 4, outline=C['hairline'])
    if covered:
        d.rounded_rectangle((x + 16, y + 306, x + 16 + int(F20.getlength(verb)), y + 328), 3, fill=C['hairline'])
    else:
        d.text((x + 16, y + 304), verb, font=F20, fill=C['bone'])
    if icons is not None:
        im.alpha_composite(icons, (x + w - 16 - icons.width, y + 305))
    if focused:
        d.rounded_rectangle((x - 4, y - 4, x + w + 3, y + 355), 12, outline=C['focus'], width=2)


def panel_r1(title, cards, topbar, out, lab, bottom_args, stage=True, covered=False):
    im, d = screen(topbar, title, stage)
    pane(d, 92, 80, 840, 440, 12, 'panel')
    if covered:
        tw = int(F20.getlength(title))
        d.rounded_rectangle((512 - tw // 2, 102, 512 + tw // 2, 122), 3, fill=C['hairline'])
    else:
        d.text((512, 112), title, font=F20, fill=C['bone'], anchor='mm')
    for i, (sc, verb, icons, foc) in enumerate(cards):
        card2(im, d, 124 + i * 396, 152, 380, sc, verb, icons, foc, covered)
    label(d, lab + (' · words covered' if covered else ''))
    verb, price, context, back = bottom_args
    if covered:
        im.alpha_composite(src('frame-cap-confirm-16.png'), (16, 574))
        d.rounded_rectangle((36, 574, 36 + int(F16.getlength(verb)), 590), 3, fill=C['hairline'])
        if price is not None:
            im.alpha_composite(price, (int(36 + F16.getlength(verb) + 24), 570))
        bw = int(F16.getlength(back))
        im.alpha_composite(src('frame-cap-back-16.png'), (1008 - 4 - bw - 16, 574))
        d.rounded_rectangle((1008 - bw, 574, 1008, 590), 3, fill=C['hairline'])
    else:
        bottom(im, d, verb, price, context, back)
    im.convert('RGB').save(os.path.join(OUT, out), optimize=True)
    print(out)
    return im


ret, keep = scene_return_home(W, H), scene_keep_home(W, H)
gain = icon_row([place_mark('place-pond-32x32.png'), essence_plus2()])
home_mark = icon_row([place_mark('frame-room-vivarium-24.png')])
grow, shape = scene_grow(W, H), scene_shape(W, H)
gp = grow_price()
out = {}
for cov in (False, True):
    sfx = '-covered' if cov else ''
    out[('ret', cov)] = panel_r1('Return Pip?', [(ret, 'Return it', gain, False), (keep, 'Keep Pip', home_mark, True)],
                                 'habitat-rest.png', 'R1-return%s.png' % sfx, 'R1 · Return and Keep, two homes',
                                 ('Keep Pip', None, '', 'Back'), covered=cov)
    out[('grow', cov)] = panel_r1('Grow this founder?', [(grow, 'Grow it', gp, True), (shape, 'Keep shaping', None, False)],
                                  'create-shape.png', 'R1-grow%s.png' % sfx, 'R1 · Grow and Keep shaping',
                                  ('Grow it', gp, '', 'Back'), stage=False, covered=cov)

sheet = Image.new('RGB', (2 * 1024 + 48, 2 * 600 + 3 * 40), C['void'])
dd = ImageDraw.Draw(sheet)
for r, key in enumerate(('ret', 'grow')):
    for c, cov in enumerate((False, True)):
        x, y = 16 + c * 1040, 40 + r * 640
        dd.text((x, y - 30), ('Return' if key == 'ret' else 'Grow') + (', words covered' if cov else ', words shown'), font=F16, fill=C['bone'])
        sheet.paste(out[(key, cov)].convert('RGB'), (x, y))
sheet.save(os.path.join(OUT, 'device-sheet-decision-r1.png'), optimize=True)
print('device-sheet-decision-r1.png')
