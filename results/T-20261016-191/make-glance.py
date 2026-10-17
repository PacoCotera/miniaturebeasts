"""The glance painted on the living window (T-20261016-191, the art director's part).

Composites on the Home golden (home-docked, 1x): the footprint ring and the kin
mark with their dark keyline, and the glance as a small slate pane of Home's own
face, lit from the top left with a tight contact shadow. Inputs come from
station-gate: prototypes/face/golden/home/home-docked.png and the Habitat
plates' 24 px emblems in prototypes/ui/assets/masters/pods/.

    python3 make-glance.py <src dir> <out dir> <Inter-Regular.ttf>
"""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops

from PIL import ImageFont

SRC, OUT, FONT = sys.argv[1], sys.argv[2], sys.argv[3]
C = dict(ground=(29, 35, 43), panel=(43, 48, 56), hairline=(61, 67, 75),
         bevel=(86, 92, 99), focus=(255, 230, 173), fog=(198, 196, 216),
         gold=(216, 155, 20), mist=(141, 138, 166))
S01 = ['coat', 'face', 'movement', 'stamina']


def emblem(ch, state):
    return Image.open(f'{SRC}/rail-emblem-{ch}-{state}-24x24.png').convert('RGBA')


def keyline_ellipse(im, box, colour, dash=0):
    """A 2 px ellipse with a 1 px dark keyline outside it, so it reads on moss, bed and soil."""
    x0, y0, x1, y1 = box
    sc = 4  # draw at 4x and reduce for a clean anti-aliased line
    w, h = (x1 - x0 + 8) * sc, (y1 - y0 + 8) * sc
    def ring(width, col, grow):
        layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        b = (4 * sc - grow * sc, 4 * sc - grow * sc, w - 4 * sc + grow * sc, h - 4 * sc + grow * sc)
        d.ellipse(b, outline=col, width=width * sc)
        if dash:
            # cut the ring into dashes by angle
            import math
            m = Image.new('L', (w, h), 0)
            md = ImageDraw.Draw(m)
            cx, cy = w / 2, h / 2
            for a in range(0, 360, dash * 2):
                md.pieslice((0, 0, w, h), a, a + dash, fill=255)
            layer.putalpha(ImageChops.multiply(layer.getchannel('A'), m))
        return layer.resize((w // sc, h // sc), Image.LANCZOS)
    key = ring(1, C['ground'] + (150,), 1)
    key2 = ring(1, C['ground'] + (110,), 0)
    line = ring(2, colour + (255,), 0)
    for l in (key, key2):
        im.alpha_composite(l, (x0 - 4, y0 - 3))
    im.alpha_composite(line, (x0 - 4, y0 - 4))


def glint(im, x, y):
    """The four-point glint: the signed gold slice (genome-glint-gold-12x12), with a 1 px ground keyline."""
    g = Image.open(f'{SRC}/genome-glint-gold-12x12.png').convert('RGBA')
    k = Image.new('RGBA', (14, 14), C['ground'] + (255,))
    m = Image.new('L', (14, 14), 0)
    m.paste(g.getchannel('A'), (1, 1))
    k.putalpha(m.filter(ImageFilter.MaxFilter(3)))
    im.alpha_composite(k, (x - 1, y - 1))
    im.alpha_composite(g, (x, y))


def well(d, x, y, state):
    """A 24 px mark well: let into the pane, dark above-left, lit below-right."""
    d.rounded_rectangle((x, y, x + 23, y + 23), 4, fill=C['ground'])
    d.line((x + 2, y + 23, x + 21, y + 23), fill=C['hairline'])
    d.line((x + 23, y + 2, x + 23, y + 21), fill=C['hairline'])
    if state == 'unread':  # the dotted edge: never its content
        for i in range(3, 21, 3):
            for p in ((x + i, y + 1), (x + i, y + 22), (x + 1, y + i), (x + 22, y + i)):
                d.point(p, fill=C['mist'])


def pane(im, x, y, chapters, states, glints):
    """The glance: one slate pane, marks in their wells, a tight contact shadow."""
    n = len(chapters)
    w, h = 8 + n * 24 + (n - 1) * 8 + 8, 32
    # contact shadow on the painting: same light as the scene (top left), tight, so it rests
    sh = Image.new('L', im.size, 0)
    ImageDraw.Draw(sh).rounded_rectangle((x + 1, y + 2, x + w + 1, y + h + 2), 8, fill=150)
    sh = sh.filter(ImageFilter.GaussianBlur(2.2))
    dark = Image.new('RGBA', im.size, C['ground'] + (255,))
    dark.putalpha(sh)
    im.alpha_composite(dark)
    p = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(p)
    d.rounded_rectangle((0, 0, w - 1, h - 1), 8, fill=C['panel'], outline=C['hairline'])
    d.arc((1, 1, 15, 15), 180, 270, fill=C['bevel'])
    d.line((8, 1, w - 9, 1), fill=C['bevel'])
    d.line((1, 8, 1, h - 9), fill=C['bevel'])
    for i, (ch, st) in enumerate(zip(chapters, states)):
        mx = 8 + i * 32
        well(d, mx, 4, st)
        e = emblem(ch, st)
        if st == 'unread':  # recedes to fog: a value step from the read bone, never brighter than the ring
            fogged = Image.new('RGBA', e.size, C['fog'] + (255,))
            fogged.putalpha(e.getchannel('A').point(lambda a: a * 42 // 100))
            e = fogged
        if st == 'sealed':
            e.putalpha(e.getchannel('A').point(lambda a: a * 45 // 100))
        p.alpha_composite(e, (mx, 4))
        if st == 'sealed':  # slats
            for sy in (9, 13, 17):
                d.line((mx + 3, 4 + sy, mx + 20, 4 + sy), fill=C['bevel'])
                d.line((mx + 3, 5 + sy, mx + 20, 5 + sy), fill=C['ground'])
    im.alpha_composite(p, (x, y))
    for i in glints:
        glint(im, x + 8 + i * 32 + 16, y + 4 - 4)  # at (16, -4) of the emblem
    return w, h


def under_feet(im, src, box):
    """The ring lies on the ground, so the mibi's feet and fur stay in front of it.
    The proof keys the resident from the golden: fur and toes are unsaturated, moss, bed and soil are not."""
    x0, y0, x1, y1 = box
    o = src.crop(box)
    hsv = o.convert('RGB').convert('HSV')
    m = Image.new('L', o.size, 0)
    for y in range(o.height):
        for x in range(o.width):
            h, sat, v = hsv.getpixel((x, y))
            if sat < 60 and (v < 115 or v > 165):
                m.putpixel((x, y), 255)
    im.paste(o, (x0, y0), m)


def kin(im, cx, cy, rw, rh, src=None):
    keyline_ellipse(im, (cx - rw, cy - rh, cx + rw, cy + rh), C['fog'], dash=14)
    if src:
        under_feet(im, src, (cx - rw - 6, cy - rh - 6, cx + rw + 6, cy + rh + 6))


def focus(im, cx, cy, rw, rh, src=None):
    keyline_ellipse(im, (cx - rw, cy - rh, cx + rw, cy + rh), C['focus'])
    if src:
        under_feet(im, src, (cx - rw - 6, cy - rh - 6, cx + rw + 6, cy + rh + 6))


def glance_at(im, cx, ring_bottom, head_top, chapters, states, glints):
    n = len(chapters)
    w = 8 + n * 24 + (n - 1) * 8 + 8
    x = max(32, min(656 - w, cx - w // 2))
    y = ring_bottom + 8
    if y + 32 > 536:
        y = head_top - 8 - 32
    return pane(im, x, y, chapters, states, glints)


def bottom_line(im, verb, origin):
    """The bottom line while a resident is focused (UI/UX section 4); the right slot is the golden's."""
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(FONT, 16)
    d.rectangle((36, 566, 400, 594), fill=(35, 41, 47))
    d.rectangle((408, 566, 616, 594), fill=(35, 41, 47))
    d.text((36, 579), verb, font=f, fill=(242, 103, 27), anchor='lm')
    d.text((512, 579), origin, font=f, fill=C['mist'], anchor='mm')


base = Image.open(f'{SRC}/home-docked.png').convert('RGBA')

# A: Moss focused on the moss; its parents Dot and Bean in the bed (only Bean's feet show)
a = base.copy()
kin(a, 574, 503, 30, 7, base)
focus(a, 318, 482, 24, 6, base)
glance_at(a, 318, 488, 420, S01, ['unread', 'read', 'read', 'read'], [])
bottom_line(a, 'Look at Moss', 'child of Dot and Bean')
a.save(f'{OUT}/glance-painted-moss.png')

# B: Bean focused in the bed: the glance sits above; its child Moss marked on the soil
b = base.copy()
kin(b, 318, 482, 24, 6, base)
focus(b, 574, 503, 30, 7, base)
glance_at(b, 574, 510, 428, S01, ['read', 'read', 'read', 'read'], [])
bottom_line(b, 'Look at Bean', 'from a meadow pod')
b.save(f'{OUT}/glance-painted-bed.png')

# C: an S03 founder focused on the moss: Glow read and changed since last looked (as a partner), the one true glint
S03 = ['coat', 'face', 'shape', 'legs-tail', 'movement', 'stamina', 'character', 'glow']
c = base.copy()
m3 = Image.open(f'{SRC}/mibi-adult-S03-304x312.png').convert('RGBA').crop((83, 136, 222, 307))
m3 = m3.resize((m3.width * 58 // 100, m3.height * 58 // 100), Image.LANCZOS)
fx, fy = 480, 396
sh = Image.new('L', c.size, 0)
ImageDraw.Draw(sh).ellipse((fx - 34, fy - 7, fx + 34, fy + 5), fill=150)
dk = Image.new('RGBA', c.size, C['ground'] + (255,))
dk.putalpha(sh.filter(ImageFilter.GaussianBlur(3)))
c.alpha_composite(dk)
focus(c, fx, fy, 30, 7)  # drawn before the sprite: the ring lies under the feet
c.alpha_composite(m3, (fx - m3.width // 2, fy - m3.height + 2))
glance_at(c, fx, fy + 6, fy - m3.height, S03,
          ['read', 'read', 'read', 'read', 'read', 'unread', 'unread', 'read'], [7])
bottom_line(c, 'Look at Lumen', 'from a cave pod')
c.save(f'{OUT}/glance-painted-glint-s03.png')

# D: the reading sheet: ring and kin on moss, bed and soil, and the glance's states, at 3x
sheet = Image.new('RGBA', (1024, 600), C['ground'] + (255,))
grounds = [('moss', (430, 430)), ('bed', (600, 512)), ('soil', (200, 520))]
for i, (name, (gx, gy)) in enumerate(grounds):
    t = base.crop((gx - 50, gy - 20, gx + 50, gy + 20)).copy()
    focus(t, 30, 20, 20, 6)
    kin(t, 72, 20, 20, 6)
    sheet.alpha_composite(t.resize((300, 120), Image.NEAREST), (24 + i * 332, 24))
t = base.crop((180, 420, 520, 560)).copy()
pane(t, 20, 40, ['coat', 'face', 'movement', 'stamina'], ['unread', 'read', 'read', 'read'], [])
pane(t, 180, 40, ['glow', 'charge', 'stamina', 'shape'], ['read', 'unread', 'sealed', 'read'], [0])
sheet.alpha_composite(t.crop((0, 20, 340, 100)).resize((1020, 240), Image.NEAREST), (2, 200))
sheet.convert('RGB').save(f'{OUT}/glance-reading-sheet.png')
