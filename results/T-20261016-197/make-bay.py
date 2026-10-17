#!/usr/bin/env python3
"""T-20261016-197: Cargo, crate by crate, as one bay deck across the whole screen (art director's layout).
Left: the dock hatch, where crates come in and wait. Centre: the open crate on the deck. Right: the edge of the Pods
case let into the bay, its free wells. Top: the materials' counters. Each content's destination answers it (a well
lights, a counter ticks); nothing is drawn between them. Composited from signed art (T-171's sources); no generated pixels.

  python3 make-bay.py SRC FONTS OUT
"""
import os, sys
here = os.path.dirname(os.path.abspath(__file__))
c2 = open(os.path.join(here, '..', 'T-20261016-171', 'make-c2.py')).read()
exec(c2[:c2.index('# --- the screen')])  # T-171's helpers: pane, key_out, contact, species_pod

X0, Y0, X1, Y1 = 16, 48, 1008, 554          # the bay: one recess, the whole stage
HATCH = (36, 92, 236, 520)                  # the dock hatch, left
CASE = (748, 76, 988, 532)                  # the Pods case's edge, right
WELLS = [(CASE[0] + 64 + c * 112, CASE[1] + 80 + r * 148) for r in range(3) for c in range(2)]  # round wells, as the Pods case's six (centres)


def deck():
    """One surface: the bay's matte slate deck, lit from the top left; no seams, no split."""
    w, h = X1 - X0, Y1 - Y0
    yy, xx = np.mgrid[0:h, 0:w]
    t = np.clip(1.0 - np.hypot(xx / w * 0.9, yy / h * 1.1) * 0.75, 0, 1)[..., None]
    rgb = np.array([40, 45, 53]) * (1 - t) + np.array([66, 72, 80]) * t
    rng = np.random.default_rng(7)
    rgb = rgb + rng.normal(0, 1.6, (h, w, 1))
    img = Image.fromarray(np.clip(rgb, 0, 255).astype('uint8'), 'RGB').convert('RGBA')
    d = ImageDraw.Draw(img)
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), 12, fill=255)
    img.putalpha(m)
    return img


def recess(im, box, r=10):
    """A recess cut into the deck: dark floor, shadow under its top edge, lit lower lip."""
    x0, y0, x1, y1 = box
    d = ImageDraw.Draw(im)
    d.rounded_rectangle(box, r, fill=C['ground'])
    sh = Image.new('L', (x1 - x0, y1 - y0), 0)
    ImageDraw.Draw(sh).rectangle((0, 0, x1 - x0, 14), fill=150)
    sh = sh.filter(ImageFilter.GaussianBlur(6))
    mk = Image.new('L', sh.size, 0); ImageDraw.Draw(mk).rounded_rectangle((0, 0, x1 - x0 - 1, y1 - y0 - 1), r, fill=255)
    lay = Image.new('RGBA', sh.size, C['void'] + (0,)); lay.putalpha(Image.fromarray(np.minimum(np.asarray(sh), np.asarray(mk))))
    im.alpha_composite(lay, (x0, y0))
    d.arc((x0, y1 - 2 * r, x0 + 2 * r, y1), 90, 180, fill=(84, 90, 98))
    d.line((x0 + r, y1, x1 - r, y1), fill=(84, 90, 98))
    d.rounded_rectangle(box, r, outline=C['hairline'])


def pod_at(im, code, cx, base, h, lit=False, dim=False):
    p = species_pod(code)
    p = p.crop(p.getbbox()); p = p.resize((round(p.width * h / p.height), h), Image.LANCZOS)
    if dim:
        a = np.asarray(p, dtype=float); a[..., :3] *= 0.62; p = Image.fromarray(a.astype('uint8'), 'RGBA')
    if lit:  # the well answers: lit from below, a mint pool on its floor
        pool = Image.new('L', (h * 2, h * 2), 0); ImageDraw.Draw(pool).ellipse((h * 0.4, h * 0.8, h * 1.6, h * 1.25), fill=150)
        pl = Image.new('RGBA', pool.size, C['mint'] + (0,)); pl.putalpha(pool.filter(ImageFilter.GaussianBlur(9)))
        im.alpha_composite(pl, (cx - h, base - h - 12))
    sh = contact(round(p.width * 0.45), 7, 0.6)
    im.alpha_composite(sh, (cx - sh.width // 2, base - sh.height // 2 - 1))
    im.alpha_composite(p, (cx - p.width // 2, base - p.height))


def case(im, holds):
    """The Pods case's edge: six wells. holds: per well None | (code, 'old'|'new')."""
    recess(im, CASE, 12)
    d = ImageDraw.Draw(im)
    R = 46
    for (wx, wy), hold in zip(WELLS, holds):
        lit = hold is not None and hold[1] == 'new'
        d.ellipse((wx - R - 4, wy - R - 4, wx + R + 4, wy + R + 4), fill=(70, 76, 84))          # the well's ring, as in Pods
        d.ellipse((wx - R, wy - R, wx + R, wy + R), fill=(22, 27, 34))
        d.arc((wx - R - 4, wy - R - 4, wx + R + 4, wy + R + 4), 200, 340, fill=(40, 45, 52), width=3)
        d.arc((wx - R - 4, wy - R - 4, wx + R + 4, wy + R + 4), 20, 160, fill=(104, 110, 118), width=2)
        if lit:
            d.ellipse((wx - R - 4, wy - R - 4, wx + R + 4, wy + R + 4), outline=C['mint'], width=2)
        if hold:
            pod_at(im, hold[0], wx, wy + 36, 74, lit=lit, dim=not lit)


def hatch(im, queued):
    """The dock hatch: where the Companion's crates come in. Its door rolled open while crates wait; shut when none do."""
    recess(im, HATCH, 12)
    d = ImageDraw.Draw(im)
    x0, y0, x1, y1 = HATCH
    if not queued:
        for i in range(0, y1 - y0 - 16, 12):
            d.rectangle((x0 + 8, y0 + 8 + i, x1 - 8, y0 + 16 + i), fill=(46, 52, 60)); d.line((x0 + 8, y0 + 8 + i, x1 - 8, y0 + 8 + i), fill=(68, 74, 82))
        return
    cr = src('crate-sealed-432x272.png'); cr = cr.crop(cr.getbbox()); cr = cr.resize((176, round(cr.height * 176 / cr.width)), Image.LANCZOS)
    for i in range(queued):
        y = y1 - 16 - (i + 1) * (cr.height + 14)          # stacked from the hatch floor; room above for a third
        sh = contact(80, 9, 0.6); im.alpha_composite(sh, ((x0 + x1) // 2 - sh.width // 2, y + cr.height - 9))
        im.alpha_composite(cr, ((x0 + x1) // 2 - cr.width // 2, y))


def open_crate(im, pods_in, cells_out):
    """The open crate on the deck, under the bay's light; pods in its sockets; the material cells stood before it."""
    pool = Image.new('L', (780, 460), 0); ImageDraw.Draw(pool).ellipse((120, 140, 660, 370), fill=60)
    pl = Image.new('RGBA', pool.size, (255, 236, 200, 0)); pl.putalpha(pool.filter(ImageFilter.GaussianBlur(40)))
    im.alpha_composite(pl, (110, 110))
    cr = src('crate-open-432x272.png'); cr = cr.crop(cr.getbbox())
    cx, top = 494, 196
    sh = contact(200, 16, 0.65); im.alpha_composite(sh, (cx - sh.width // 2, top + cr.height - 22))
    im.alpha_composite(cr, (cx - cr.width // 2, top))
    sockets = [(cx - 112, top + 96), (cx, top + 96), (cx + 112, top + 96)]   # each socket's floor
    for (sx, sy), code in zip(sockets, pods_in):
        if code:
            pod_at(im, code, sx, sy + 12, 94)
    if cells_out:
        for i, (n, fig) in enumerate((('energy', '+6'), ('data', '+4'), ('essence', '+9'))):
            c = src('cargo-%s-72x96.png' % n); c = c.crop(c.getbbox())
            x, base = 330 + i * 90, 528
            sh = contact(26, 6, 0.6); im.alpha_composite(sh, (x - sh.width // 2, base - 7))
            im.alpha_composite(c, (x - c.width // 2, base - c.height))


def frame(title_counts, ticks, verb, context):
    im = Image.new('RGBA', (1024, 600), C['ground'] + (255,))
    d = ImageDraw.Draw(im)
    home = src('home-docked.png')
    im.alpha_composite(home.crop((0, 0, 1024, 40)))
    d.rectangle((44, 4, 250, 36), fill=C['bar']); d.text((48, 20), 'Cargo', font=F20, fill=C['bone'], anchor='lm')
    d.rectangle((384, 4, 680, 36), fill=C['bar'])
    ic = {k: key_out(home.crop((x, 10, x + 16, 26)), C['bar']) for k, x in (('energy', 437), ('data', 497), ('essence', 552))}
    x = 400
    for k in ('energy', 'data', 'essence'):
        n = title_counts[k]; plus = ticks.get(k, '')
        im.alpha_composite(ic[k], (x, 12)); d.text((x + 20, 10), n, font=F16, fill=C['bone'])
        x2 = x + 20 + int(F16.getlength(n)) + 6
        if plus:
            d.text((x2, 10), plus, font=F16, fill=C['mint']); x2 += int(F16.getlength(plus)) + 4
        x = x2 + 22
    im.alpha_composite(deck(), (X0, Y0))
    ImageDraw.Draw(im).rounded_rectangle((X0, Y0, X1 - 1, Y1 - 1), 12, outline=C['hairline'])
    d = ImageDraw.Draw(im)
    d.rectangle((0, 562, 1023, 599), fill=C['bar']); d.line((0, 562, 1023, 562), fill=C['void'])
    im.alpha_composite(src('frame-cap-confirm-16.png'), (16, 574)); d.text((36, 572), verb, font=F16, fill=C['orange'])
    if context:
        d.text((512, 582), context, font=F16, fill=C['mist'], anchor='mm')
    im.alpha_composite(src('frame-cap-back-16.png'), (int(1008 - 4 - F16.getlength('Home') - 16), 574))
    d.text((1008, 582), 'Home', font=F16, fill=C['fog'], anchor='rm')
    return im


OLD = [('S05', 'old'), ('S01', 'old'), ('S03', 'old')]
# 1. a crate opening: two more wait in the hatch; the crate open, its pods in their sockets, its cells stood out
a = frame({'energy': '13', 'data': '17', 'essence': '21'}, {}, 'Open them all', '')
hatch(a, 2); case(a, OLD + [None, None, None]); open_crate(a, ['S01', 'S03', 'S05'], True)
a.convert('RGB').save(os.path.join(OUT, 'bay-1-opening.png'), optimize=True)
# 2. the contents arrived: the pods in the case's free wells, each well lit; the counters ticked; the crate's sockets empty
b = frame({'energy': '19', 'data': '21', 'essence': '30'}, {'energy': '+6', 'data': '+4', 'essence': '+9'}, 'Open them all', '')
hatch(b, 2); case(b, OLD + [('S01', 'new'), ('S03', 'new'), ('S05', 'new')]); open_crate(b, [None, None, None], False)
b.convert('RGB').save(os.path.join(OUT, 'bay-2-arrived.png'), optimize=True)
# 3. the last crate: the hatch shut, the case full, one pod waits in its socket for a well (a plain wait)
c = frame({'energy': '27', 'data': '24', 'essence': '36'}, {}, 'Pods', 'a pod waits for a well')
hatch(c, 0); case(c, [('S05', 'old'), ('S01', 'old'), ('S03', 'old'), ('S01', 'old'), ('S03', 'old'), ('S05', 'old')])
open_crate(c, [None, 'S03', None], False)
c.convert('RGB').save(os.path.join(OUT, 'bay-3-last.png'), optimize=True)
print('bay-1-opening.png bay-2-arrived.png bay-3-last.png')

# the device sheet: Home, the three Cargo frames, the Pods room
F16b = F('Regular', 16)
sheet = Image.new('RGB', (2 * 1024 + 48, 3 * 640 + 40), C['void']); dd = ImageDraw.Draw(sheet)
cells = [(src('home-docked.png'), 'Home: crates waiting, ✓ Open the bay'), (a, 'Cargo 1: a crate opening'),
         (b, 'Cargo 2: the contents arrived (wells lit, counters ticked)'), (c, 'Cargo 3: the last crate, a pod waits for a well'),
         (src('pods-collection.png'), 'Pods: the case the wells belong to')]
for i, (img, lab) in enumerate(cells):
    x, y = 16 + (i % 2) * 1040, 40 + (i // 2) * 640
    dd.text((x, y - 30), lab, font=F16b, fill=C['bone'])
    sheet.paste(img.convert('RGB'), (x, y))
sheet.save(os.path.join(OUT, 'device-sheet-cargo-bay.png'), optimize=True)
print('device-sheet-cargo-bay.png')
