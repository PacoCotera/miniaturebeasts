#!/usr/bin/env python3
"""T-20261016-171: Cargo as the receiving bay, crate by crate (C2, CD review §3.4), on slate.
Composited by hand from signed art; no generated pixels. Style guide §4, §2, §3; UI/UX layout cargo-c2-crate.

  python3 make-c2.py SRC FONTS OUT
"""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC, FONTS, OUT = sys.argv[1:4]
C = {'void': (12, 10, 18), 'ground': (29, 35, 43), 'bar': (35, 41, 47), 'panel': (43, 48, 56), 'hairline': (61, 67, 75),
     'bevel': (86, 92, 99), 'bone': (241, 235, 223), 'fog': (198, 196, 216), 'mist': (141, 138, 166), 'mint': (173, 246, 224),
     'tealD': (15, 76, 80), 'orange': (242, 103, 27), 'focus': (255, 230, 173), 'amber': (255, 168, 63)}
F = lambda w, s: ImageFont.truetype(os.path.join(FONTS, 'Inter-%s.ttf' % w), s)
F16, F20, F13 = F('Regular', 16), F('Medium', 20), F('Regular', 13)
src = lambda n: Image.open(os.path.join(SRC, n)).convert('RGBA')


def pane(d, x, y, w, h, r=8, fill='panel'):
    d.rounded_rectangle((x, y, x + w - 1, y + h - 1), r, fill=C[fill], outline=C['hairline'])
    d.line((x + r, y + 1, x + w - r - 1, y + 1), fill=C['bevel'])
    d.line((x + 1, y + r, x + 1, y + h - r - 1), fill=C['bevel'])


def key_out(img, col, tol=12):
    a = np.asarray(img).copy(); a[(np.abs(a[..., :3].astype(int) - col).max(axis=2) <= tol), 3] = 0
    return Image.fromarray(a, 'RGBA')


def contact(w, h, alpha=0.6):
    s = Image.new('L', (w * 2, h * 2), 0)
    ImageDraw.Draw(s).ellipse((w // 2, h // 2, w * 3 // 2, h * 3 // 2), fill=int(255 * alpha))
    o = Image.new('RGBA', s.size, (8, 10, 14, 0)); o.putalpha(s.filter(ImageFilter.GaussianBlur(h / 3)))
    return o


def species_pod(code):
    pod = json.load(open(os.path.join(SRC, 'species-%s.json' % code)))['pod']
    pat = {'smooth dots': 'dots', 'soft ribs': 'ribs', 'segments': 'segments', 'plates': 'plates'}
    name = next((v for k, v in pat.items() if k in (pod.get('shellPattern') or '')), None)
    ld = lambda n: np.asarray(src('pod-collection-%s.png' % n), dtype=float) / 255
    has = lambda n: os.path.exists(os.path.join(SRC, 'pod-collection-%s.png' % n))
    sh, bd, ac = ld('shade'), ld('mask-body')[..., 3], ld('mask-accent')[..., 3]
    pt = ld('pattern-' + name)[..., 3] if name and has('pattern-' + name) else 0 * bd
    rl = ld('pattern-%s-relief' % name)[..., 0] * 2 if name and has('pattern-%s-relief' % name) else np.ones_like(bd)
    A, B = [np.array([int(c['hex'][i:i + 2], 16) / 255 for i in (1, 3, 5)]) for c in pod['colourPair']]
    rgb = np.minimum(1, (A * (bd * (1 - pt))[..., None] + B * np.minimum(1, ac + pt)[..., None]) * sh[..., :1] * 2 * rl[..., None])
    return Image.fromarray((np.dstack([rgb, sh[..., 3:4]]) * 255).round().astype('uint8'), 'RGBA')


def slate_bay(w, h):
    """The signed bay painting re-toned onto the slate face: its painted shading kept, its brown wall and sage floor
    mapped onto the device's slate tones (a diagram until the bay is repainted)."""
    bay = src('cargo-bay-992x320.png').resize((w, round(320 * w / 992)), Image.LANCZOS)
    l = np.asarray(bay.convert('L'), dtype=float) / 255
    lo, hi = np.array(C['void'], float), np.array([96, 104, 112], float)
    t = np.clip((l - 0.15) / 0.6, 0, 1)[..., None]
    rgb = lo * (1 - t) + hi * t
    out = Image.fromarray(rgb.astype('uint8'), 'RGB').convert('RGBA').crop((0, 0, w, min(h, round(320 * w / 992))))
    full = Image.new('RGBA', (w, h), C['ground'] + (255,))
    wall = round(180 * w / 992)                       # keep the back wall and the sides; the floor is the bay's own
    full.alpha_composite(out.crop((0, 0, w, wall)))
    f = np.linspace(0, 1, h - wall)[:, None, None]
    floor = (np.array([52, 58, 66]) * (1 - f) + np.array([30, 35, 42]) * f) * np.ones((1, w, 1))
    full.alpha_composite(Image.fromarray(floor.astype('uint8'), 'RGB').convert('RGBA'), (0, wall))
    ImageDraw.Draw(full).line((10, wall, w - 11, wall), fill=(70, 77, 85))
    return full


# --- the screen ------------------------------------------------------------------------------------------------
im = Image.new('RGBA', (1024, 600), C['ground'] + (255,))
d = ImageDraw.Draw(im)
home = src('home-docked.png')
im.alpha_composite(home.crop((0, 0, 1024, 40)))
d.rectangle((44, 4, 250, 36), fill=C['bar'])
d.text((48, 20), 'Cargo', font=F20, fill=C['bone'], anchor='lm')
d.rectangle((384, 4, 640, 36), fill=C['bar'])
ic = {k: key_out(home.crop((x, 10, x + 16, 26)), C['bar']) for k, x in (('energy', 437), ('data', 497), ('essence', 552))}
x = 400
for k, n, plus in (('energy', '19', '+6'), ('data', '21', ''), ('essence', '30', '')):
    im.alpha_composite(ic[k], (x, 12)); d.text((x + 20, 10), n, font=F16, fill=C['bone'])
    x2 = x + 20 + int(F16.getlength(n)) + 6
    if plus:
        d.text((x2, 10), plus, font=F16, fill=C['mint']); x2 += int(F16.getlength(plus)) + 4
    x = x2 + 22
# the bay: one recess cut into the slate face, its door at the back
bay = slate_bay(992, 504)
im.alpha_composite(bay, (16, 48))
d.rounded_rectangle((16, 48, 1007, 551), 14, outline=C['hairline'])
# the door: the opening the crates came through, its shutter rolled most of the way up (no outline)
d.rectangle((372, 70, 652, 168), fill=(10, 12, 16))
for i in range(6):                                            # the shutter's slats, lit from above
    y = 70 + i * 9
    d.rectangle((372, y, 652, y + 7), fill=(58, 64, 72))
    d.line((372, y, 652, y), fill=(84, 90, 98))
    d.line((372, y + 7, 652, y + 7), fill=(22, 26, 32))
d.rectangle((372, 124, 652, 168), fill=(8, 10, 14))           # the dark beyond, where the crates come from
d.rectangle((366, 166, 658, 171), fill=(70, 77, 85))          # the sill
d.line((366, 166, 658, 166), fill=C['bevel'])
light = Image.new('L', (1024, 600), 0); ImageDraw.Draw(light).ellipse((250, 120, 780, 470), fill=58)
warm = Image.new('RGBA', (1024, 600), (255, 236, 210, 0)); warm.putalpha(light.filter(ImageFilter.GaussianBlur(60))); im.alpha_composite(warm)
# the crates of this dock: done, this one, still sealed
for i, (st, ring) in enumerate((('done', False), ('now', True), ('sealed', False))):
    c = src('crate-sitting-48x40.png')
    if st == 'done':                                          # opened and emptied: the open crate, small
        c = src('crate-open-432x272.png').resize((52, 33), Image.LANCZOS)
        cc = Image.new('RGBA', (52, 40), (0, 0, 0, 0)); cc.alpha_composite(c, (0, 7)); c = cc
    if st == 'sealed':
        a = np.asarray(c, dtype=float); a[..., :3] *= 0.45; c = Image.fromarray(a.astype('uint8'), 'RGBA')
    cx = 40 + i * 60
    im.alpha_composite(c, (cx - (2 if st == 'done' else 0), 196))
    if ring:
        d.rounded_rectangle((cx - 5, 191, cx + 52, 241), 9, outline=C['focus'], width=2)
# the crate, opened, painted large, with its trip's place
crate = src('crate-open-432x272.png').resize((380, 239), Image.LANCZOS)
cx0, cy0 = 512 - 190, 176
im.alpha_composite(src('crate-shadow-432x24.png').resize((380, 21), Image.LANCZOS), (cx0, cy0 + 226))
im.alpha_composite(crate, (cx0, cy0))
badge = src('place-pond-48x48.png')
d.rounded_rectangle((cx0 + 22, cy0 + 150, cx0 + 78, cy0 + 206), 8, fill=C['ground'], outline=C['hairline'])
im.alpha_composite(badge, (cx0 + 26, cy0 + 154))
# its contents, laid out in front as the things themselves
pods = [species_pod(c).resize((70, 89), Image.LANCZOS) for c in ('S01', 'S03', 'S05')]
for i, p in enumerate(pods):
    px = 372 + i * 84
    im.alpha_composite(contact(66, 12, 0.6), (px + 2, 518))
    im.alpha_composite(p, (px, 436))
for k, (nm, n, xx) in enumerate((('cargo-data-48x64.png', '+4', 650), ('cargo-essence-48x64.png', '+9', 714))):
    im.alpha_composite(contact(44, 10, 0.55), (xx + 2, 512))
    im.alpha_composite(src(nm), (xx, 456))
    d.text((xx + 24, 534), n, font=F16, fill=C['mint'], anchor='mm')
# Energy in flight to the top bar's counter: the cell part-way, its path dotted in device light
cell = src('cargo-energy-48x64.png')
p0, p1, p2 = (430, 250), (300, 90), (430, 26)
pts = []
for t in np.linspace(0, 1, 40):
    x_ = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0]
    y_ = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]
    pts.append((x_, y_))
for i in range(4, 40, 2):
    d.ellipse((pts[i][0] - 1.5, pts[i][1] - 1.5, pts[i][0] + 1.5, pts[i][1] + 1.5), fill=C['mint'] + (int(255 * i / 40),))
im.alpha_composite(cell, (int(pts[16][0]) - 24, int(pts[16][1]) - 32))
d.text((int(pts[16][0]) - 50, int(pts[16][1]) + 36), 'in flight', font=F13, fill=C['mint'])
# the Pods hatch, open only while the pods fly: the wells they land in
pane(d, 848, 256, 144, 128, 10, 'panel')
d.rounded_rectangle((856, 264, 983, 375), 8, fill=(18, 22, 28))
for i in range(3):
    wx = 866 + i * 38
    d.rounded_rectangle((wx, 300, wx + 30, 340), 6, fill=C['ground'], outline=C['mint'])
for i in range(0, 30, 2):
    t = i / 30
    x_, y_ = 612 + (856 - 612) * t, 470 - (470 - 330) * t - 30 * math.sin(math.pi * t)
    d.ellipse((x_ - 1.5, y_ - 1.5, x_ + 1.5, y_ + 1.5), fill=C['focus'])
d.text((740, 392), 'in flight', font=F13, fill=C['focus'])
# the frame's bottom line
d.rectangle((0, 562, 1023, 599), fill=C['bar']); d.line((0, 562, 1023, 562), fill=C['void'])
im.alpha_composite(src('frame-cap-confirm-16.png'), (16, 574)); d.text((36, 572), 'Open them all', font=F16, fill=C['orange'])
d.text((512, 582), 'from the pond', font=F16, fill=C['mist'], anchor='mm')
im.alpha_composite(src('frame-cap-back-16.png'), (int(1008 - 4 - F16.getlength('Home') - 16), 574))
d.text((1008, 582), 'Home', font=F16, fill=C['fog'], anchor='rm')
d.text((32, 506), 'C2 · crate by crate', font=F13, fill=C['fog'])
d.text((32, 524), 'concept, composited from signed art;', font=F13, fill=C['mist'])
d.text((32, 540 - 2), 'the bay re-toned to slate', font=F13, fill=C['mist'])
im.convert('RGB').save(os.path.join(OUT, 'C2-crate-by-crate.png'), optimize=True)
print('C2-crate-by-crate.png')
