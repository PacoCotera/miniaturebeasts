#!/usr/bin/env python3
"""T-20261016-200: Home's living window with four real version-4 Loika pods (the genome engineer's seeds 165, 168,
10 and 116), each drawn from its read looks with the layered stand: Colour (a painted ramp, or a two-tone for a mixed
coat), Markings (stripes, patches, or both), Crown and Eyes (T-190). Same placing and contact shadows as T-190.

  python3 make-window.py SRC FONTS OUT
"""
import os, sys
here = os.path.dirname(os.path.abspath(__file__))
mr = open(os.path.join(here, 'make-range.py')).read()
exec(mr[:mr.index("# the genome engineer's likely frame")])   # the stand layers (T-190) and the colour and mark layers

RAMPS2 = {'charcoal': ((22, 21, 25), (52, 50, 56), (104, 100, 108)), 'russet': RAMPS['russet'],
          'periwinkle': ((52, 40, 104), (128, 108, 210), (204, 190, 248))}
BASE_H = PLAIN.crop(PLAIN.getbbox()).height     # one scale for all four (T-190): size is not a locus
sc = lambda img, h: img.resize((round(img.width * h / BASE_H), round(img.height * h / BASE_H)), Image.LANCZOS)
EYES = {'eyes between': 'between', 'wide pale rings': 'wide', 'thin rings': 'thin'}
PODS = [  # gs, the read looks (results/T-20261016-200/genome-engineer.md)
    (165, 'charcoal', 'patches', 'leaf crest', 'eyes between'),
    (168, 'russet', 'stripes', 'leaf crest', 'wide pale rings'),
    (10, 'charcoal and periwinkle', 'stripes and patches', 'bare head', 'thin rings'),
    (116, 'periwinkle', 'patches', 'leaf crest', 'thin rings'),
]


def stand_v4(colour, pattern, crown, eye_look):
    base = loika('pale patches' if 'patches' in pattern else 'plain', crown, EYES[eye_look])
    m = fur_mask(np.asarray(base, dtype=float))
    if ' and ' in colour:
        pa, pb = colour.split(' and ')
        img = two_tone(base, RAMPS2[pa], RAMPS2[pb], m)
    else:
        img = recolour(base, RAMPS2[colour], m)
    if 'stripes' in pattern:
        img = stripes(img, m)
    return img


glass = src('home-glass-day-640x488.png')
win = glass.copy()
spots = [(140, 326, 150), (500, 270, 118), (420, 384, 140), (250, 436, 128)]   # T-190's ground rows
for i in sorted(range(4), key=lambda i: spots[i][1]):
    gs, col, pat, crown, eye_look = PODS[i]
    s = sc(stand_v4(col, pat, crown, eye_look), spots[i][2])
    if i in (1, 2):
        s = s.transpose(Image.FLIP_LEFT_RIGHT)
    x, y = spots[i][:2]
    cw = int(s.width * 0.42)
    win.alpha_composite(contact(cw, 12, 0.62), (x - cw, y - 14))
    win.alpha_composite(s, (x - s.width // 2, y - s.height))
today = src('home-docked.png').crop((16, 48, 672, 552))
out = Image.new('RGBA', (656 + 16 + 640 + 32, 520 + 44 + 70), (12, 10, 18, 255)); d = ImageDraw.Draw(out)
d.text((16, 12), 'Today (B-4 golden): one stand for every adult Loika', font=F16, fill=(241, 235, 223))
d.text((656 + 32, 12), 'Version 4: four real pods, each drawn from its read looks', font=F16, fill=(241, 235, 223))
out.alpha_composite(today, (16, 44))
out.alpha_composite(win.crop((0, 0, 640, 488)), (656 + 32, 44))
for i, (gs, col, pat, crown, eye_look) in enumerate(PODS):
    d.text((656 + 32, 548 + i * 18), 'gs %d: %s, %s, %s, %s' % (gs, col, pat, crown, eye_look), font=F13, fill=(198, 196, 216))
out.convert('RGB').save(os.path.join(OUT, 'home-window-four-v4-pods.png'), optimize=True)
print('home-window-four-v4-pods.png')

# its four-grey twin: the window quantised to four values (the guide's colour-alone test)
wa = np.asarray(win.crop((0, 0, 640, 488)).convert('RGB'), dtype=float)
lum = wa[..., 0] * 0.299 + wa[..., 1] * 0.587 + wa[..., 2] * 0.114
q = np.choose(np.digitize(lum, [64, 128, 192]), [30, 100, 170, 240]).astype('uint8')
Image.fromarray(q, 'L').convert('RGB').save(os.path.join(OUT, 'home-window-four-v4-pods-four-grey.png'), optimize=True)
print('home-window-four-v4-pods-four-grey.png')
