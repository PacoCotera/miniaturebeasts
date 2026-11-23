from PIL import Image, ImageDraw
R = '/home/mb/mb/pool/loika-curl-token-1/'
F = R + 'tools/credit-runner/runs/loika-curl-token-1/frames/'
T = '/home/mb/mb/scratch-lct1/t1/'
OUT = R + 'tools/credit-runner/runs/loika-curl-token-1/'
BG = (92, 158, 78, 255)

def lab(d, xy, s): d.text(xy, s, fill=(255, 255, 255, 255))

# --- part 1: frames at 1x and x4, beside her signed idle token and the room curl
signed_plain = Image.open(R + 'art/walk-token-saddle-2/frames/loika-s01-idle-right-plain.png').convert('RGBA')
signed_sad = Image.open(R + 'art/walk-token-saddle-2/frames/loika-s01-idle-right-saddled.png').convert('RGBA')
room = Image.open(R + 'prototypes/ui/assets/masters/pods/mibi-adult-S01-between-between-lay-saddle-curl-48x48.png').convert('RGBA')
cells = [('signed idle plain', signed_plain), ('curl plain 0', Image.open(F + 'loika-s01-idle-right-plain-curl-0.png')), ('curl plain 1', Image.open(F + 'loika-s01-idle-right-plain-curl-1.png')),
         ('signed idle saddled', signed_sad), ('curl saddled 0', Image.open(F + 'loika-s01-idle-right-saddled-curl-0.png')), ('curl saddled 1', Image.open(F + 'loika-s01-idle-right-saddled-curl-1.png')), ('room curl 48px', room)]
cw = 4 * 48 + 8
p1 = Image.new('RGBA', (cw * len(cells), 4 * 48 + 20 + 48 + 8), BG)
d = ImageDraw.Draw(p1)
for i, (n, im) in enumerate(cells):
    im = im.convert('RGBA'); x = i * cw + 4
    lab(d, (x, 2), n)
    if im.size[0] == 48 and 'room' in n:
        p1.alpha_composite(im.resize((192, 192), Image.NEAREST), (x, 16)); p1.alpha_composite(im, (x, 16 + 196))
    else:
        p1.alpha_composite(im.resize((128, 128), Image.NEAREST), (x, 16)); p1.alpha_composite(im, (x, 16 + 196))
lab(d, (4, 16 + 196 + 50), '1x row below x4')

# --- part 2: place stills, a crop round the curled Loika (found by the player's orange dot), 3x
def player(im):
    px = im.convert('RGB').load(); xs = []; ys = []
    for y in range(80, 600):
        for x in range(40, im.size[0] - 40):
            r, g, b = px[x, y]
            if r > 200 and 80 < g < 130 and b < 70: xs.append(x); ys.append(y)
    return (sum(xs) // len(xs), sum(ys) // len(ys)) if xs else None

def crop(path, ref):
    im = Image.open(path).convert("RGBA"); p = player(Image.open(ref))
    if not p: return None
    k = im.size[0] / 390.0; c = im.crop((int(p[0] - 10 * k), int(p[1] - 130 * k), int(p[0] + 140 * k), int(p[1] - 30 * k))).resize((150, 100), Image.NEAREST)
    return c.resize((c.size[0] * 2, c.size[1] * 2), Image.NEAREST)

rows = []
for place, lbl in (('a', 'meadow'), ('g', 'grove (wood)')):
    for w in (390, 522):
        for sad in ('plain', 'saddled'):
            for fr in (0,):
                row = []
                for part in ('day', 'dusk', 'night'):
                    c = crop(T + '%s-%d-%s-%d-%s.png' % (place, w, sad, fr, part), T + '%s-%d-%s-%d-day.png' % (place, w, sad, fr))
                    if c: row.append(c)
                if row: rows.append(('%s %d %s' % (lbl, w, sad), row))
cw2 = rows[0][1][0].size[0] + 6; ch2 = rows[0][1][0].size[1] + 18
p2 = Image.new('RGBA', (cw2 * 3, ch2 * len(rows)), (30, 30, 40, 255))
d2 = ImageDraw.Draw(p2)
for j, (n, row) in enumerate(rows):
    lab(d2, (4, j * ch2 + 3), n)
    for i, c in enumerate(row): p2.alpha_composite(c, (i * cw2 + 3, j * ch2 + 16))
W = max(p1.size[0], p2.size[0]); sheet = Image.new('RGBA', (W, p1.size[1] + p2.size[1] + 10), (30, 30, 40, 255))
sheet.alpha_composite(p1, (0, 0)); sheet.alpha_composite(p2, (0, p1.size[1] + 10))
sheet.convert('RGB').save(OUT + 'sheet.png'); print(sheet.size)
