#!/usr/bin/env python3
"""The style guide's plates: one rule per plate, a do beside a don't, at 1x.

Run from the repository root:
  python3 design/style-guide/plates/make-plates.py SRC FONTS

SRC holds the inputs: committed goldens of the device sheet (tools/device-sheet.json
on work-queue), signed slices from masters-pods, station-gate masters and the owner's
screenshot. FONTS holds Inter-{Regular,Medium,SemiBold}.ttf (OFL). Every crop is at 1x;
a drawn example is a diagram in exact palette colours, labelled as such.
"""
import json, math, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC, FONTS = sys.argv[1], sys.argv[2]
OUT = os.path.dirname(os.path.abspath(__file__))
PAL = dict(json.load(open('prototypes/ui/palettes/station.json'))['colours'])
C = {k: tuple(int(v[i:i + 2], 16) for i in (1, 3, 5)) for k, v in PAL.items()}


def font(w, s):
    return ImageFont.truetype(os.path.join(FONTS, 'Inter-%s.ttf' % w), s)


F16, F20, F28 = font('Regular', 16), font('Medium', 20), font('SemiBold', 28)
F13, F16M = font('Regular', 13), font('Medium', 16)


def src(name):
    return Image.open(os.path.join(SRC, name)).convert('RGBA')


def crop(name, box):
    x, y, w, h = box
    return src(name).crop((x, y, x + w, y + h))


def canvas(w, h, col='ground'):
    return Image.new('RGBA', (w, h), C[col] + (255,))


def text(d, xy, s, f=F16, col='bone', anchor='la'):
    d.text(xy, s, font=f, fill=C[col] if isinstance(col, str) else col, anchor=anchor)


def pane(d, x, y, w, h, r=8, fill='panel'):
    """A pane of the display: flat fill, 1 px hairline, one bevel of light top and left."""
    d.rounded_rectangle((x, y, x + w - 1, y + h - 1), r, fill=C[fill], outline=C['hairline'])
    d.arc((x + 1, y + 1, x + 2 * r, y + 2 * r), 180, 270, fill=C['bevel'])
    d.line((x + r, y + 1, x + w - r - 1, y + 1), fill=C['bevel'])
    d.line((x + 1, y + r, x + 1, y + h - r - 1), fill=C['bevel'])


def wrap(s, f, w):
    out, line = [], ''
    for word in s.split():
        t = (line + ' ' + word).strip()
        if f.getlength(t) <= w:
            line = t
        else:
            out.append(line)
            line = word
    return out + [line]


def mark(d, x, y, ok):
    """The plate's own do/don't marks: a mint disc with a tick, a coral disc with a cross."""
    d.ellipse((x, y, x + 19, y + 19), fill=C['aqua' if ok else 'red'])
    if ok:
        d.line((x + 5, y + 10, x + 8, y + 13, x + 14, y + 6), fill=C['ink'], width=2)
    else:
        d.line((x + 6, y + 6, x + 13, y + 13), fill=C['white'], width=2)
        d.line((x + 13, y + 6, x + 6, y + 13), fill=C['white'], width=2)


def plate(pid, title, do, dont, do_cap, dont_cap):
    """Do on the left, don't on the right, each with its caption, at 1x."""
    M, G = 16, 24
    cw = [max(do.width, 300), max(dont.width, 300)]
    caps = [wrap(do_cap, F16, cw[0]), wrap(dont_cap, F16, cw[1])]
    ih = max(do.height, dont.height)
    ch = 20 * max(len(c) for c in caps)
    W = max(M * 2 + cw[0] + G + cw[1], int(F20.getlength(pid + '  ' + title)) + 2 * M)
    H = 48 + 32 + ih + 12 + ch + M
    im = canvas(W, H, 'void')
    d = ImageDraw.Draw(im)
    text(d, (M, 14), pid + '  ' + title, F20)
    x = M
    for i, (img, cap, ok) in enumerate(((do, caps[0], True), (dont, caps[1], False))):
        mark(d, x, 50, ok)
        text(d, (x + 28, 50), 'DO' if ok else "DON'T", F16M, 'mint' if ok else 'coral')
        im.alpha_composite(img, (x, 80))
        d.rectangle((x - 1, 79, x + img.width, 80 + img.height), outline=C['night'])
        for j, line in enumerate(cap):
            text(d, (x, 80 + ih + 12 + 20 * j), line, F16, 'fog')
        x += cw[0] + G
    im.convert('RGB').save(os.path.join(OUT, pid + '.png'), optimize=True)
    print(pid, im.size)


def single(pid, title, img, cap):
    M = 16
    lines = wrap(cap, F16, img.width)
    im = canvas(img.width + 2 * M, 48 + img.height + 12 + 20 * len(lines) + M, 'void')
    d = ImageDraw.Draw(im)
    text(d, (M, 14), pid + '  ' + title, F20)
    im.alpha_composite(img, (M, 48))
    for j, line in enumerate(lines):
        text(d, (M, 48 + img.height + 12 + 20 * j), line, F16, 'fog')
    im.convert('RGB').save(os.path.join(OUT, pid + '.png'), optimize=True)
    print(pid, im.size)


def ss_draw(w, h, fn, k=8):
    """Draw a diagram 8x and reduce it (rings, pools)."""
    big = Image.new('RGBA', (w * k, h * k), (0, 0, 0, 0))
    fn(ImageDraw.Draw(big), k)
    return big.resize((w, h), Image.LANCZOS)


def ring(w, frac, track='tealD', lit='mint', thick=8):
    def fn(d, k):
        b = (thick * k // 2, thick * k // 2, w * k - thick * k // 2, w * k - thick * k // 2)
        d.arc(b, 135, 405, fill=C[track], width=thick * k)
        if frac > 0:
            d.arc(b, 135, 135 + 270 * frac, fill=C[lit], width=thick * k)
    return ss_draw(w, w, fn)


def glow_pool(w, h, cx, cy, rx, ry, col, a):
    """A soft cast pool: an ellipse at alpha a, blurred by a third of its height."""
    im = Image.new('RGBA', (w, h), C[col] + (0,))
    m = Image.new('L', (w, h), 0)
    ImageDraw.Draw(m).ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=int(255 * a))
    im.putalpha(m.filter(ImageFilter.GaussianBlur(max(2, ry / 3))))
    return im


# ---------------------------------------------------------------- 1 the look
plate('01-look', 'One device: the living window leads, the instrument serves',
      src('home-docked.png'), src('incubator-ready.png'),
      'Home, accepted by the owner: warm daylight in the vivarium, the device around it calm, matte and dark. The eye goes to the life first.',
      'The rejected Incubator (06:38): brown on brown, a cream ring, an egg on a moss cradle, a green plastic plaque, a pixel glyph and jargon in a floating box.')

# ---------------------------------------------------------------- 2 palette
roles = [
    ('Housing (painted)', [('sage', 'housing'), ('sageD', 'housing shade'), ('sand', 'housing accent'), ('deepTeal', 'rubber'), ('metal', 'screws, fittings')]),
    ('Display (art layer)', [('ground', 'display field'), ('bar', 'top bar, bottom line'), ('panel', 'pane, card, well'), ('hairline', 'edge, rule'), ('bevel', 'bevel light')]),
    ('Device light', [('mint', 'lit: progress, changed, live'), ('aqua', 'lit, mid'), ('teal', 'ring, lamp'), ('tealD', 'unlit track')]),
    ('Signals', [('orange', 'the action only'), ('focus', 'focus ring, price'), ('amber', 'needs you'), ('coral', 'loss words'), ('red', 'clash, loss mark')]),
    ('State', [('frost', 'unknown, veil'), ('frostD', 'frost shade'), ('yellow', 'glint: a first, new'), ('gold', 'glint shade')]),
    ('Type', [('bone', 'readouts, names'), ('fog', 'way back'), ('mist', 'context, quiet')]),
]
im = canvas(1024, 470, 'void')
d = ImageDraw.Draw(im)
for ci, (head, sw) in enumerate(roles):
    x, y = 16 + (ci % 3) * 336, 8 + (ci // 3) * 232
    text(d, (x, y), head, F16M, 'bone')
    for j, (k, role) in enumerate(sw):
        yy = y + 28 + j * 38
        d.rectangle((x, yy, x + 31, yy + 31), fill=C[k], outline=C['night'])
        text(d, (x + 44, yy - 1), '%s  %s' % (k, PAL[k]), F16, 'bone')
        text(d, (x + 44, yy + 17), role, F13, 'mist')
single('02a-palette', 'The palette by role (exact values: prototypes/ui/palettes/station.json)', im,
       'Every colour the device draws, by its one role. A colour is used only for its role. Painted art carries its own colours inside these families; type takes its colour from the type roles.')

do = canvas(480, 240)
d = ImageDraw.Draw(do)
pane(d, 24, 24, 432, 192)
text(d, (48, 44), 'Moss', F28)
text(d, (48, 88), 'your Loika, young', F16, 'fog')
ri = ring(96, 0.62)
do.alpha_composite(ri, (336, 64))
text(d, (384, 112), '62%', F16, 'mint', 'mm')
text(d, (48, 176), 'ready in about 8 min', F16, 'mint')
dont = crop('panel-wild.png', (96, 82, 480, 240))
plate('02b-colour-panel', 'Panes are slate; brown and cream panels are forbidden', do, dont,
      'A pane of the display: panel #2b3038 on the display field ground #1d232b, one bevel, bone type, live readouts in mint. Diagram.',
      'The rejected Return panel: brown on brown, a brown card on a brown panel on a brown stage. No bark, soil, clay, paper or cream fill on any panel.')

do = canvas(420, 340)
d = ImageDraw.Draw(do)
r2 = ring(240, 0.55, thick=10)
do.alpha_composite(r2, (90, 40))
for i in range(8):
    a = math.radians(135 + 270 * i / 7)
    cx, cy = 210 + 132 * math.cos(a), 160 + 132 * math.sin(a)
    d.ellipse((cx - 3, cy - 3, cx + 3, cy + 3), fill=C['mint' if i / 7 <= 0.55 else 'tealD'])
text(d, (210, 300), 'ready in about 8 min', F16, 'mint', 'mm')
dont = crop('incubator-ready.png', (300, 80, 420, 340))
plate('02c-colour-progress', 'Progress is device light: mint on an unlit teal track', do, dont,
      'The ring of time in mint #adf6e0 on tealD #0f4c50, the chapters as lit studs, the wait in mint words. Diagram.',
      'The rejected ring: cream on brown. Owner: "the cream color is terrible, that doesn\'t communicate tech or science". Cream never draws progress.')

# ---------------------------------------------------------------- 3 materials and light
hands = Image.open('art/concept-homepage/station-research-hands.png').convert('RGBA')
do = hands.crop((300, 80, 780, 330))
dont = crop('incubator-ready.png', (752, 340, 160, 170))
plate('03a-housing', 'Housing: matte sage powder-coat, dark rubber, screws', do, dont,
      'station-research-hands (approved concept, generated): matte sage, rubber corners, recessed screws, a dark bezel around the display. Soft, broad highlights; no reflections.',
      'The rejected stamp plaque: a green plaque that reads as plastic or metal, with a hard specular edge. Owner: "that metallic/plastic green plaque is also terrible".')

do = crop('pods-overview-identified.png', (150, 220, 230, 230))
dont = crop('incubator-growing.png', (380, 120, 300, 340))
plate('03b-light', 'One key light from the top left; every object sits on something', do, dont,
      'The pod in its fitted cut-out (Pods): lit from the top left, form shading, a contact shadow where it sits. It is in the device, not on it.',
      'The rejected candling: a flat egg laid over a moss cushion, its shadow painted on, no contact. Owner: "the craddle with moss, and a weird egg overimposed".')

base = crop('pods-overview-identified.png', (150, 220, 230, 230))
do = canvas(360, 240)
d = ImageDraw.Draw(do)
do.alpha_composite(glow_pool(360, 240, 180, 186, 96, 22, 'mint', 0.45))
do.alpha_composite(src('place-wood-48x48.png'), (156, 140))
d.rectangle((168, 24, 191, 35), fill=C['deepTeal'])
d.rectangle((172, 36, 187, 39), fill=C['mint'])
cone = glow_pool(360, 240, 180, 110, 44, 80, 'mint', 0.12)
do.alpha_composite(cone)
text(d, (180, 214), 'the light lands on what it lights', F13, 'mist', 'mm')
dont = canvas(360, 240)
dd = ImageDraw.Draw(dont)
halo = Image.new('RGBA', (360, 240), (0, 0, 0, 0))
hd = ImageDraw.Draw(halo)
hd.rounded_rectangle((40, 50, 320, 190), 12, outline=C['aqua'], width=6)
hd.text((180, 120), 'GROWING', font=F28, fill=C['aqua'], anchor='mm')
dont.alpha_composite(halo.filter(ImageFilter.GaussianBlur(8)))
dont.alpha_composite(halo.filter(ImageFilter.GaussianBlur(3)))
dd.rounded_rectangle((40, 50, 320, 190), 12, outline=C['mint'], width=2)
dd.text((180, 120), 'GROWING', font=F28, fill=C['white'], anchor='mm')
plate('03c-glow', 'Light is cast, never worn: no glow on type, panes or edges', do, dont,
      'A lamp casts a pool on the surface under it, no wider than what it lights, at most 55% over the field. Diagram.',
      'A neon halo on a pane edge and on type: a glowing HUD. Never: glow, bloom, neon or a lit outline around type. Diagram.')

viv = crop('home-docked.png', (24, 60, 320, 220))
do = viv.copy()
dont = viv.copy()
st = Image.new('RGBA', dont.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(st)
for off in (40, 70, 190):
    sd.polygon([(off, 0), (off + 26, 0), (off - 80, 220), (off - 106, 220)], fill=(255, 255, 255, 70))
dont.alpha_composite(st.filter(ImageFilter.GaussianBlur(2)))
plate('03d-glass', 'Glass is clear and matte-edged: you look into it, not at it', do, dont,
      'The vivarium window on Home: the life seen straight through, its edge a dark rubber bezel. Glass appears only where something lives or grows behind it.',
      'The same window with gloss streaks: polished glass and reflections are on the Never list. Diagram over the accepted capture.')

# ---------------------------------------------------------------- 4 components
wild = crop('vivarium-away.png', (40, 60, 348, 160))
pip = Image.open('art/miniature-lives/assets/rich-plain-300x310.png').convert('RGBA')
small = pip.resize((54, 56), Image.LANCZOS).transpose(Image.FLIP_LEFT_RIGHT)
wild.alpha_composite(small, (236, 92))
near = Image.open('prototypes/ui/assets/masters/vivarium/vivarium-near-dusk-544x408.png').convert('RGBA').crop((60, 180, 408, 340))
big = pip.resize((150, 155), Image.LANCZOS)
near.alpha_composite(big, (100, 8))
do = canvas(808, 300)
d = ImageDraw.Draw(do)
pane(d, 0, 0, 808, 300, 12)
for i, (pic, name, line, col) in enumerate(((wild, 'Return Fig', 'Gone for good.', 'coral'), (near, 'Keep Fig', 'Stays with you.', 'mist'))):
    x = 16 + i * 396
    pane(d, x, 16, 380, 268, 8, 'ground')
    do.alpha_composite(pic, (x + 16, 32))
    text(d, (x + 16, 200), name, F20)
    text(d, (x + 16, 236), line, F16, col)
d.rounded_rectangle((16 + 396 - 4, 12, 16 + 396 + 383, 287), 10, outline=C['focus'], width=2)
dont = crop('panel-wild.png', (96, 82, 832, 400))
plate('04a-decision-panel', 'A decision shows two futures that look different', do, dont,
      'Each option is its outcome: small and far in the wild, walking away; big and close at home. Slate panel, wells on the field colour, the verb, one line, loss in coral. Diagram from accepted art (Pip, the vivarium), not a master.',
      'The rejected Return panel: the same Pip on the same plinth twice, only the backdrop differs. Owner: "side by side the two options look the same".')

line = crop('home-docked.png', (0, 562, 1024, 38))
do = canvas(560, 38)
do.alpha_composite(line.crop((0, 0, 400, 38)), (0, 0))
do.alpha_composite(line.crop((904, 0, 1024, 38)), (440, 0))
dont = canvas(560, 120)
d = ImageDraw.Draw(dont)
for x, w, col, s in ((40, 200, 'orange', 'OK'), (300, 200, 'leaf', 'Cancel')):
    d.rounded_rectangle((x, 40, x + w, 84), 22, fill=C[col])
    text(d, (x + w // 2, 62), s, F20, 'white', 'mm')
plate('04b-keys', 'Actions are the device keys, said on the bottom line', do, dont,
      'The bottom line: the orange ✓ cap and the verb, the price icon before figure; at the right, the ← cap and where it goes. Cut from Home at 1×.',
      'On-screen buttons. The Station has physical keys: nothing on screen is a button, and orange marks only the ✓ action. Diagram.')

def tile(state):
    t = canvas(96, 96)
    d = ImageDraw.Draw(t)
    pane(d, 16, 16 - (2 if state == 'focus' else 0), 64, 64, 8, 'ground')
    t.alpha_composite(src('place-wood-48x48.png'), (24, 24 - (2 if state == 'focus' else 0)))
    if state == 'focus':
        d.rounded_rectangle((12, 10, 83, 81), 10, outline=C['focus'], width=2)
    if state == 'dim':
        veil = Image.new('RGBA', (64, 64), C['ground'] + (150,))
        t.alpha_composite(veil, (16, 16))
    if state == 'new':
        t.alpha_composite(src('glint-star-12x12.png'), (66, 12))
    return t
do = canvas(4 * 96 + 32, 136)
d = ImageDraw.Draw(do)
for i, (s, w) in enumerate((('rest', 'rest'), ('focus', 'focused'), ('dim', 'dimmed'), ('new', 'new'))):
    do.alpha_composite(tile(s), (8 + i * 104, 0))
    text(d, (56 + i * 104, 112), w, F13, 'mist', 'mm')
dont = canvas(416, 136)
d = ImageDraw.Draw(dont)
d.rectangle((24, 24, 392, 64), fill=C['sea'])
text(d, (36, 34), '> Loika  (adult)  lv.3', F16, 'white')
d.rectangle((24, 72, 392, 112), outline=C['hairline'])
text(d, (36, 82), '  Belatz (young)  lv.1', F16, 'fog')
plate('04c-focus-tiles', 'Focus is a ring that walks between things; the focused thing lifts', do, dont,
      'A tile well 64 px, radius 8, in its four states: rest; focused (the focus ring 2 px, 4 px out, the tile lifted 2 px); dimmed (veiled, still focusable); new (the glint). Diagram.',
      'A list cursor: a filled highlight bar over rows of words. Never a list, a cursor bar or a row selection. Diagram.')

do = canvas(320, 120)
d = ImageDraw.Draw(do)
for i, (n, w) in enumerate((('place-wood-32x32.png', 'wood'), ('place-pond-32x32.png', 'pond'), ('place-meadow-32x32.png', 'meadow'))):
    do.alpha_composite(src(n), (40 + i * 100, 28))
    text(d, (56 + i * 100, 84), w, F16, 'bone', 'mm')
dont = canvas(320, 120)
d = ImageDraw.Draw(dont)
dont.alpha_composite(src('genome-place-wood-10x10.png'), (60, 50))
text(d, (78, 49), 'S03 · C2 · 7/9', F13, 'mist')
plate('04d-badge', 'A badge is a painted thing at 32 px or more, with its word', do, dont,
      'Place badges at 32×32, each a painted piece of the place, with one word under it at 16 px. Signed slices.',
      'A 10 px glyph with codes beside it: a meaning no first-time player can read. A mark under 24 px never carries meaning alone.')

do = canvas(380, 120)
d = ImageDraw.Draw(do)
for i, (n, w) in enumerate((('genome-gene-open-40x40.png', 'open'), ('genome-gene-open-lit-40x40.png', 'changed'), ('genome-gene-only-40x40.png', 'one look'), ('genome-gene-closed-40x40.png', 'breeding'), ('genome-gene-open-clash-40x40.png', 'clash'), ('genome-gene-self-40x40.png', 'self'))):
    do.alpha_composite(src(n), (16 + i * 60, 28))
    text(d, (36 + i * 60, 88), w, F13, 'mist', 'mm')
dont = crop('incubator-ready.png', (730, 98, 206, 236))
plate('04e-genome-marks', 'Genome marks: sculpted, lit, 40 px on Create', do, dont,
      'The gene marks at 40 px (tier L), lit from the top left, each state a distinct shape as well as a colour. Signed slices (masters-pods).',
      'The rejected reveal: a pixel stroke as the trait, "Just cleared", "Stamina Efficiency". Owner: "the icon for the trait is also pixelated and impossible to understand".')

# ---------------------------------------------------------------- 5 type
do = canvas(440, 200)
d = ImageDraw.Draw(do)
pane(d, 16, 16, 408, 168)
text(d, (40, 32), 'Moss', F28)
text(d, (40, 76), 'Revealed', F20)
text(d, (40, 112), 'walks a long way before it tires', F16, 'bone')
text(d, (40, 140), 'a Loika, young', F16, 'fog')
dont = canvas(440, 200, 'clay')
d = ImageDraw.Draw(dont)
d.rectangle((16, 16, 424, 184), fill=C['paper'])
text(d, (28, 24), 'CHARACTER: UNFLAPPABLE', F16M, 'sand')
y = 52
for s in ('Just cleared. This chapter has been read by', 'the incubator while the bud grows. Stamina:', 'Efficiency. Nerve: unflappable. Curiosity:', 'seeking. Next to clear: Movement (gait).', 'Ready in about 8 minutes at current rate.'):
    text(d, (28, y), s, F13, 'clay')
    y += 18
plate('05a-type', 'Three sizes, light type on slate, a few words', do, dont,
      'Inter 28 semibold for a name, 20 medium for a title, 16 regular for readouts; bone, with fog for the quiet line on a pane. Plain words. Diagram.',
      'Cream panel, 13 px, capitals, low contrast, a paragraph of jargon. Every one of these is forbidden. Diagram.')

do = canvas(380, 220)
d = ImageDraw.Draw(do)
pane(d, 16, 16, 348, 188)
do.alpha_composite(src('genome-gene-open-lit-40x40.png'), (40, 40))
text(d, (96, 44), 'Markings', F20)
text(d, (96, 76), 'you changed this', F16, 'mint')
text(d, (40, 140), 'Grow it', F20, 'orange')
text(d, (40, 172), 'The pod is used.', F16, 'fog')
dont = src('2026-10-17-create-slip.png')
plate('05b-words', 'Words budget: six words an object, never a list of lines', do, dont,
      'One word or a short line per object, and a picture or mark wherever it can say it. Diagram.',
      'The rejected slip (owner screenshot): "a wall of text that nobody will read".')

# ---------------------------------------------------------------- 6 icons and marks
do = canvas(360, 140)
d = ImageDraw.Draw(do)
do.alpha_composite(src('cargo-energy-48x64.png'), (32, 24))
do.alpha_composite(src('face-loika-24.png'), (160, 44))
text(d, (200, 46), 'Loika', F16)
do.alpha_composite(src('place-pond-32x32.png'), (160, 84))
text(d, (200, 90), 'pond', F16)
dont = crop('cargo-report.png', (240, 130, 360, 150))
plate('06a-marks', 'A mark is a thing you recognise, at a size you can read', do, dont,
      'Things drawn as things: the energy cells as a crate holds them, a painted face and a place badge with their words. A meaning-carrying mark is 24 px or more.',
      'The rejected Cargo report: colour pips and 16 px glyphs no one can decode. Owner: "impossible to know what the color bar mean".')

do = canvas(360, 120)
d = ImageDraw.Draw(do)
do.alpha_composite(src('genome-gene-open-clash-40x40.png'), (32, 24))
text(d, (88, 34), 'clash', F16, 'coral')
d.ellipse((200, 30, 223, 53), fill=C['red'])
d.line((205, 35, 218, 48), fill=C['white'], width=2)
d.line((218, 35, 205, 48), fill=C['white'], width=2)
text(d, (232, 34), 'gone for good', F16, 'coral')
dont = canvas(360, 120)
d = ImageDraw.Draw(dont)
d.rounded_rectangle((32, 24, 71, 63), 8, fill=C['red'])
d.rounded_rectangle((88, 24, 127, 63), 8, fill=C['leaf'])
d.rounded_rectangle((144, 24, 183, 63), 8, fill=C['gold'])
text(d, (32, 80), 'which one is bad?', F13, 'mist')
plate('06b-colour-alone', 'Colour never carries meaning alone', do, dont,
      'A clash is red and a crossed shape; a loss is coral words with the cross. It reads in four-gray too.',
      'Three chips that differ only by hue: unreadable to many players and on paper. Diagram.')

# ---------------------------------------------------------------- 7 layout
def overlay(img):
    o = img.copy()
    d = ImageDraw.Draw(o)
    for y in (40, 48, 552, 562):
        d.line((0, y, 1023, y), fill=C['aqua'])
    for x in (16, 1008):
        d.line((x, 40, x, 562), fill=C['aqua'])
    return o
do = overlay(src('home-docked.png'))
dont = overlay(src('create-shape.png'))
plate('07a-layout', 'The frame and the grid: top bar 40, stage 522, bottom line 38; 16 px margins', do, dont,
      'Home on the grid: every region inside the 16 px margins and y 48–552, aligned in columns, 8 px between related things, 16 between groups.',
      'Create (batch B-3): things float on an empty field at uneven gaps, no surface, no grid. Owner: "all elements in create screen are floating".')

comp = Image.open('art/concept-homepage/companion-resident-home-450x600.png').convert('RGBA')
do = comp.copy()
d = ImageDraw.Draw(do)
for y in (32, 564):
    d.line((0, y, 449, y), fill=C['aqua'])
dont = comp.resize((300, 400), Image.BILINEAR)
plate('07b-companion-frame', 'The Companion: HUD 32, view 532, bottom line 36, shown at 1:1', do, dont,
      'companion-resident-home (approved concept, generated) at 450×600, 1×, the frame lines marked.',
      'The same screen at a fractional scale: smeared pixels. The Companion is shown only at 1:1 or a whole multiple.')

# ---------------------------------------------------------------- 9 motion
im = canvas(1024, 300, 'void')
d = ImageDraw.Draw(im)
rows = [('press', [(0, 100, 'lift 2 px'), (100, 200, 'settle')], 'aqua'),
        ('refusal', [(0, 240, 'shake 3 px, twice'), (240, 4240, 'message plate 4 s')], 'coral'),
        ('notice', [(0, 200, 'slides in'), (200, 4000, 'stays until resolved')], 'amber'),
        ('control moves', [(0, 300, 'door, rail, lamp: 200–400 ms, eased')], 'teal'),
        ('reveal', [(0, 2000, 'frost wipes off, about 2 s')], 'frost'),
        ('dock arrival', [(0, 400, 'lamp to mint'), (400, 2200, 'crates slide into the bay')], 'mint')]
scale = 820 / 4400
for i, (name, segs, col) in enumerate(rows):
    y = 24 + i * 44
    text(d, (16, y + 4), name, F16, 'bone')
    for a, b, lab in segs:
        x0, x1 = 180 + a * scale, 180 + b * scale
        d.rounded_rectangle((x0, y, max(x1, x0 + 6), y + 26), 4, fill=C[col] + (255,), outline=C['void'])
        text(d, (x0 + 6, y + 5), lab, F13, 'ink')
for t in range(0, 4401, 1000):
    x = 180 + t * scale
    d.line((x, 284, x, 290), fill=C['mist'])
    text(d, (x, 276), '%d s' % (t // 1000), F13, 'mist', 'mm')
single('09a-motion', 'Motion: the device moves only when something happens', im,
       'Timings on the Station. The first frame is always the still state; nothing means something only by blinking; presses during a motion are consumed. Diagram.')

# ---------------------------------------------------------------- 10 paper
do = canvas(300, 140)
d = ImageDraw.Draw(do)
pane(d, 24, 24, 252, 92)
text(d, (48, 40), 'Loika', F20)
text(d, (48, 76), 'this pod', F16, 'mist')
dont = crop('pods-overview-identified.png', (200, 410, 120, 110))
plate('10a-paper', 'What changes is on the machine; paper is only in the Library', do, dont,
      'A name and a state on the display, in a pane. Diagram.',
      'A paper tag on Pods. Owner: "paper has a place in the library, the rest is a STATION".')

# ---------------------------------------------------------------- 11 companion
hb = Image.open('art/miniature-lives/assets/hibit-plain-280x300.png').convert('RGBA')
dont = hb.resize((140, 150), Image.BILINEAR).resize((280, 300), Image.BILINEAR)
a = dont.split()[3].point(lambda v: 255 if v > 40 else 0)
edge = a.filter(ImageFilter.MaxFilter(5))
blk = Image.new('RGBA', dont.size, (0, 0, 0, 255))
out = Image.new('RGBA', dont.size, (0, 0, 0, 0))
out.paste(blk, (0, 0), edge)
out.alpha_composite(dont)
plate('11a-companion-hibit', 'Companion creatures: HiBit, crisp pixels, outlines in the part\'s own dark', hb, out,
      'The accepted HiBit Pip at 280×300, 1×: rounded volume, catch-lit eyes, 1 px outline in each part\'s darkest step, no alpha, no anti-aliasing.',
      'The same Pip smoothed and outlined in black: blur, anti-aliasing and black lines are forbidden on the Companion. Diagram.')

c2 = Image.open('art/companion-48/type/contact-2x.png').convert('RGBA')
c1 = Image.open('art/companion-48/type/contact-1x.png').convert('RGBA')
plate('11b-companion-type', 'Companion type: Mibi 7×9 at 2× or 3×, never 1×', c2.crop((0, 0, min(420, c2.width), min(160, c2.height))),
      c1.crop((0, 0, min(420, c1.width), min(160, c1.height))),
      'The Mibi bitmap face at 2× (14 px caps), the body size.',
      'The same face at 1×: too small to read on the device.')
