# The original concept's caps (the owner's direction): square glossy keys in the Station's four colours with the
# concept's own glyphs, Print without the word, back, the pad and confirm in the same gloss. Cap masters (the printed glyph,
# one colour, white = ink, the 10 mm slot at 100 px/mm), the 24 px title marks, the sandbox key icons and the signed sheet.
# python3 -I original.py <art/device-buttons>
import sys, os, json, hashlib, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
D = sys.argv[1]; SS = 8
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
# cap colour, glyph ink, shape
CAPS = {'station-home': ('#e9b22e', '#2f2b28', 'square', 'home'), 'station-research': ('#2f7fd8', '#ffffff', 'square', 'research'),
        'station-library': ('#7a3f8f', '#f4f1ec', 'square', 'library'), 'station-vivarium': ('#5ea64c', '#2f2b28', 'square', 'vivarium'),
        'caddy-print': ('#383434', '#f4f1ec', 'square', 'print'),
        'back': ('#33363b', '#f4f1ec', 'round', 'back'), 'confirm': ('#f0661a', '#ffffff', 'round', 'confirm'), 'pad': ('#2e3136', '#f4f1ec', 'rocker', 'pad')}
def glyph(name, size):
    S = size*SS; u = S/100; P = lambda x, y: (x*u, y*u); m = Image.new('L', (S, S), 0); d = ImageDraw.Draw(m)
    if name == 'home':  # a solid house, a door cut out
        d.polygon([P(50, 24), P(80, 50), P(73, 50), P(73, 76), P(27, 76), P(27, 50), P(20, 50)], fill=255)
        d.rectangle([P(43, 58), P(57, 76)], fill=0)
    elif name == 'research':  # the outline test tube with its lip, tilted, tip to the upper right
        t = Image.new('L', (S, S), 0); dt = ImageDraw.Draw(t)
        dt.rounded_rectangle([P(42, 22), P(58, 84)], radius=8*u, outline=255, width=int(4.5*u))
        dt.line([P(37, 23), P(63, 23)], fill=255, width=int(5*u)); dt.line([P(37, 16), P(63, 16)], fill=255, width=int(3*u))
        m = t.rotate(-38, resample=Image.BICUBIC, center=(S/2, S/2))
    elif name == 'library':  # an open book, its pages filled
        d.polygon([P(50, 36), P(38, 30), P(22, 32), P(22, 70), P(38, 68), P(50, 74)], fill=255)
        d.polygon([P(50, 36), P(62, 30), P(78, 32), P(78, 70), P(62, 68), P(50, 74)], fill=255)
        d.line([P(50, 36), P(50, 74)], fill=0, width=int(3*u))
    elif name == 'vivarium':  # a solid leaf, tip to the upper right, its vein running to a stem
        pts = []
        for i in range(61):
            t = i/60; x = 28 + 48*t; y = 74 - 48*t; o = 17*math.sin(math.pi*t)**0.9; pts.append((x - o*0.707, y - o*0.707))
        for i in range(60, -1, -1):
            t = i/60; x = 28 + 48*t; y = 74 - 48*t; o = 17*math.sin(math.pi*t)**0.9; pts.append((x + o*0.707, y + o*0.707))
        d.polygon([P(*p) for p in pts], fill=255)
        d.line([P(22, 80), P(64, 38)], fill=0, width=int(3*u)); d.line([P(20, 82), P(30, 72)], fill=255, width=int(4*u))
    elif name == 'print':  # A: the printer alone, larger (UI/UX: the word at ~1.2 mm is marginal)
        w = int(5*u)
        d.rectangle([P(32, 18), P(68, 36)], outline=255, width=w)
        d.rounded_rectangle([P(18, 36), P(82, 66)], radius=6*u, outline=255, width=w)
        d.rectangle([P(32, 54), P(68, 80)], outline=255, width=w, fill=0)
    elif name == 'print-word':  # B: a smaller printer and PRINT at cap height >= 2 mm on the 10.5 mm glyph field
        w = int(4*u)
        d.rectangle([P(38, 10), P(62, 22)], outline=255, width=w)
        d.rounded_rectangle([P(28, 22), P(72, 42)], radius=4*u, outline=255, width=w)
        d.rectangle([P(38, 34), P(62, 48)], outline=255, width=w, fill=0)
        f = ImageFont.truetype(BOLD, int(27*u)); tw = d.textlength('PRINT', font=f)
        d.text(((S - tw)/2, 54*u), 'PRINT', fill=255, font=f)
    if name == 'confirm':
        d.line([P(28, 52), P(44, 68), P(74, 34)], fill=255, width=int(11*u), joint='curve')
    elif name == 'back':
        d.line([P(30, 50), P(70, 50)], fill=255, width=int(9*u)); d.line([P(47, 33), P(30, 50), P(47, 67)], fill=255, width=int(9*u), joint='curve')
    elif name == 'pad':
        for poly in ([P(50, 14), P(41, 27), P(59, 27)], [P(50, 86), P(41, 73), P(59, 73)], [P(14, 50), P(27, 41), P(27, 59)], [P(86, 50), P(73, 41), P(73, 59)]):
            d.polygon(poly, fill=255)
    return m
def hexrgb(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
def cap(name, size):
    """A square glossy cap: rounded square, soft dome shading, a dark lower edge, a gloss highlight upper left, the glyph printed."""
    col, gcol, shape, gname = CAPS[name]; S = size*SS; base = hexrgb(col)
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0)); r = S*0.45 if shape != 'square' else S*0.16
    mask = Image.new('L', (S, S), 0); ImageDraw.Draw(mask).rounded_rectangle([S*.05, S*.05, S*.95, S*.95], radius=r, fill=255)
    skirt = Image.new('L', (S, S), 0); ImageDraw.Draw(skirt).rounded_rectangle([S*.05, S*.08, S*.95, S*.98], radius=r, fill=255)
    img.paste(tuple(int(v*.55) for v in base) + (255,), (0, 0), skirt)         # the cap's lower wall
    face = Image.new('RGB', (S, S)); fp = face.load()
    for y in range(0, S, 2):
        for x in range(0, S, 2):
            f = 1.08 - 0.30*((x + y)/(2*S)); c = tuple(max(0, min(255, int(v*f))) for v in base)
            for dx in (0, 1):
                for dy in (0, 1):
                    if x+dx < S and y+dy < S: fp[x+dx, y+dy] = c
    img.paste(face, (0, 0), mask)
    hl = Image.new('L', (S, S), 0); ImageDraw.Draw(hl).rounded_rectangle([S*.10, S*.08, S*.90, S*.26], radius=r*.6, fill=70)
    hl = ImageChops.multiply(hl, mask).filter(ImageFilter.GaussianBlur(S*.03))
    img = Image.composite(Image.new('RGBA', (S, S), (255, 255, 255, 255)), img, hl)
    ImageDraw.Draw(img).rounded_rectangle([S*.05, S*.05, S*.95, S*.95], radius=r, outline=tuple(int(v*.45) for v in base) + (255,), width=int(S*.018))
    g = glyph(gname, size).crop((0, 0, S, S)); gs = Image.new('L', (S, S), 0); gs.paste(g.resize((int(S*.7), int(S*.7)), Image.LANCZOS), (int(S*.15), int(S*.15)))
    img.paste(hexrgb(gcol) + (255,), (0, 0), gs)
    return img.resize((size, size), Image.LANCZOS)
HOME = """
........................
........................
...........##...........
..........####..........
.........######.........
........########........
.......##########.......
......############......
.....##############.....
....################....
...##################...
..####################..
....################....
....################....
....################....
....######....######....
....######....######....
....######....######....
....######....######....
....######....######....
....######....######....
....######....######....
........................
........................
"""
RESEARCH = """
........................
........................
..............##........
...............##.......
...............####.....
..............######....
.............##...###...
............##...####...
...........###..###.....
...........##...##......
..........##...##.......
.........##...##........
........###..##.........
.......#######..........
......########..........
.....########...........
.....#######............
....#######.............
....######..............
.....####...............
......##................
........................
........................
........................
"""
LIBRARY = """
........................
........................
........................
........................
..######........######..
..#########..#########..
..#########..#########..
..#########..#########..
..#########..#########..
..#########..#########..
..#########..#########..
..#########..#########..
..#########..#########..
..#########..#########..
..#########..#########..
..#########..#########..
..##########.#########..
.....#######.######.....
..........##.#..........
........................
........................
........................
........................
........................
"""
VIVARIUM = """
........................
........................
.................#####..
..............########..
............##########..
...........#######.###..
..........######..####..
.........######..#####..
........######..######..
........#####..######...
.......#####..#######...
.......####..#######....
.......###..#######.....
.......##..#######......
.......#..#######.......
......#..#######........
......#.#######.........
.....##.######..........
.....##..###............
....##..................
...##...................
...##...................
........................
........................
"""

def grid(art):
    rows = [r for r in art.strip('\n').split('\n')]; assert len(rows) == 24 and all(len(r) == 24 for r in rows)
    return rows
MARKS = {'home': (HOME, '#ffd441', '#2f2b28'), 'research': (RESEARCH, '#3084d8', '#ffffff'),
         'library': (LIBRARY, '#dbc0ff', '#f4f1ec'), 'vivarium': (VIVARIUM, '#5cbb4c', '#2f2b28')}
def paint(rows, col):
    rgb = hexrgb(col); im = Image.new('RGBA', (24, 24), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch == '#':
                assert 2 <= x <= 21 and 2 <= y <= 21, ('live area', x, y); im.putpixel((x, y), rgb + (255,))
    return im
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
# 1. cap masters: the printed glyph, white = ink, the 10 mm slot (the glyph field) at 100 px/mm; the pad keeps its signed 20 mm master
man = json.load(open(os.path.join(D, 'caps', 'manifest.json'))); byid = {e['id']: e for e in man}
for key, (col, ink, shape, gname) in CAPS.items():
    cid = 'cap-pad-20mm' if key == 'pad' else f'cap-{key}-10mm'; e = byid[cid]
    if key not in ('pad',):
        m = glyph(gname, 125).resize((1000, 1000), Image.LANCZOS).point(lambda v: 255 if v >= 128 else 0).convert('1')
        p = os.path.join(D, 'caps', f'{cid}.png'); m.save(p, dpi=(2540, 2540)); e['sha256'] = sha(p); e['drawing'] = 'original: ' + gname
    e.update({'cap_colour': col, 'engraving': 'printed glyph, ' + ink, 'finish': 'gloss', 'shape': {'square': 'square, rounded corners', 'round': 'round', 'rocker': 'round rocker face'}[shape],
              'status': 'signed', 'signed_in': 'art director, the original caps'})
json.dump(man, open(os.path.join(D, 'caps', 'manifest.json'), 'w'), indent=1)
# 2. the 24 px title marks and the sandbox key icons (the same alpha)
mm = json.load(open(os.path.join(D, 'marks', 'slices', 'manifest.json')))
for n, (art, col, ink) in MARKS.items():
    rows = grid(art)
    for mid, c, rect, what in ((f'frame-room-{n}-24', col, [16, 8, 24, 24], 'title mark, one palette colour'), (f'shell-key-{n}-24', ink, None, 'sandbox key icon, the title mark\'s alpha in the key ink')):
        p = os.path.join(D, 'marks', 'slices', mid + '.png'); paint(rows, c).save(p)
        mm[mid] = {'size': [24, 24], 'rect': rect, 'src': 'typed by hand (source/original.py)', 'made': f'the {n.capitalize()} {what} ({c}), from the original concept glyph',
                   'sha256': sha(p), 'status': 'signed'}
        if rect is None: del mm[mid]['rect']
json.dump(mm, open(os.path.join(D, 'marks', 'slices', 'manifest.json'), 'w'), indent=1)
# proofs of the marks at 8x on the bar, and the key icons on their keys
pr = Image.new('RGBA', (4*32 + 8, 2*32 + 8), (0x23, 0x29, 0x2f, 255))
for i, n in enumerate(MARKS):
    a = Image.open(os.path.join(D, 'marks', 'slices', f'frame-room-{n}-24.png')); pr.alpha_composite(a, (8 + 32*i, 4))
    ImageDraw.Draw(pr).rounded_rectangle([4 + 32*i, 34, 31 + 32*i, 67], radius=4, fill=hexrgb(CAPS['station-' + n][0]))
    b = Image.open(os.path.join(D, 'marks', 'slices', f'shell-key-{n}-24.png')); pr.alpha_composite(b, (6 + 32*i, 38))
pr.save(os.path.join(D, 'marks', 'marks-proof-1x.png')); pr.resize((pr.width*8, pr.height*8), Image.NEAREST).save(os.path.join(D, 'marks', 'marks-proof-8x.png'))
# 3. the signed sheet: every button on the three devices
ns = {'__name__': 'lib'}; exec(open(os.path.join(D, 'source', 'drawings.py')).read(), ns); old = ns['cap']
OLD = {'companion-call': ('#2a9f90', 'call'), 'caddy-left': ('#33363b', 'left'), 'caddy-ok': ('#33363b', 'confirm'), 'caddy-right': ('#33363b', 'right'), 'caddy-feed': ('#33363b', 'feed2')}
def any_cap(n, sz):
    if n in CAPS: return cap(n, sz)
    c, dr = OLD[n]; return old(c, dr, sz)
W, H = 1440, 900; sheet = Image.new('RGB', (W, H), (0xa9, 0x9f, 0x8a)); d = ImageDraw.Draw(sheet)
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 22); fs = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
d.text((40, 24), 'Every button on the three devices: the original caps, signed.', fill=(30, 32, 36), font=f)
d.text((40, 56), 'Square glossy keys with the concept\'s glyphs; back, the pad and confirm in the same gloss. Hand-drawn, not generated.', fill=(40, 42, 46), font=fs)
rows = [('Station', [('Pad', 'pad'), ('Home', 'station-home'), ('Vivarium', 'station-vivarium'), ('Research', 'station-research'), ('Library', 'station-library'), ('Back', 'back'), ('Confirm', 'confirm')]),
        ('Companion', [('Pad', 'pad'), ('Call', 'companion-call'), ('Back', 'back'), ('Confirm', 'confirm')]),
        ('Caddy', [('Left', 'caddy-left'), ('OK', 'caddy-ok'), ('Right', 'caddy-right'), ('Print', 'caddy-print'), ('Feed', 'caddy-feed')])]
y = 100
for dev, keys in rows:
    d.text((40, y + 45), dev, fill=(30, 32, 36), font=f); x = 200
    for lab, n in keys:
        sz = 140 if n == 'pad' else 112; k = any_cap(n, sz)
        sheet.paste(k, (x, y + (112 - sz) // 2 + 4), k); d.text((x + sz // 2 - len(lab) * 4, y + 128), lab, fill=(40, 42, 46), font=fs); x += sz + 44
    y += 175
d.text((40, y + 5), 'Near real size', fill=(30, 32, 36), font=fs)
d.rounded_rectangle([40, y + 30, 1400, y + 120], radius=16, fill=(0xd6, 0xd3, 0xc2)); x = 60
for dev, keys in rows:
    for lab, n in keys:
        sz = 68 if n == 'pad' else 56; k = any_cap(n, sz); sheet.paste(k, (x, y + 75 - sz // 2), k); x += sz + 6
    x += 40
d.text((40, y + 140), 'Signed, Station art director. Masters: the printed glyph per cap, one colour, in caps/ with manifest.json (colour, ink, finish, shape).', fill=(30, 32, 36), font=fs)
sheet.save(os.path.join(D, 'device-buttons-final.png')); print('ok')
