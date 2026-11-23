from PIL import Image, ImageDraw
R = '/home/mb/mb/pool/loika-curl-token-2/'
RUN = R + 'tools/credit-runner/runs/loika-curl-token-2/'
F = RUN + 'frames/'
S = '/home/mb/mb/scratch-lct2/'
BG = (92, 158, 78, 255)

def lab(d, xy, s): d.text(xy, s, fill=(255, 255, 255, 255))

cells = [('signed idle plain', R + 'art/walk-token-saddle-2/frames/loika-s01-idle-right-plain.png'), ('curl plain 0', F + 'loika-s01-idle-right-plain-curl-0.png'), ('curl plain 1', F + 'loika-s01-idle-right-plain-curl-1.png'),
         ('signed idle saddled', R + 'art/walk-token-saddle-2/frames/loika-s01-idle-right-saddled.png'), ('curl saddled 0', F + 'loika-s01-idle-right-saddled-curl-0.png'), ('curl saddled 1', F + 'loika-s01-idle-right-saddled-curl-1.png'),
         ('room curl 48px', R + 'prototypes/ui/assets/masters/pods/mibi-adult-S01-between-between-lay-saddle-curl-48x48.png')]
cw = 4 * 48 + 8
p1 = Image.new('RGBA', (cw * len(cells), 4 * 48 + 20 + 48 + 8), BG)
d = ImageDraw.Draw(p1)
for i, (n, path) in enumerate(cells):
    im = Image.open(path).convert('RGBA'); x = i * cw + 4
    lab(d, (x, 2), n)
    k = 4 if im.size[0] == 32 else 4
    p1.alpha_composite(im.resize((im.size[0] * k, im.size[1] * k), Image.NEAREST), (x, 16)); p1.alpha_composite(im, (x, 16 + 196))
lab(d, (4, 16 + 196 + 50), '1x row below x4')

def player(im):
    px = im.convert('RGB').load(); xs = []; ys = []
    for y in range(80, 600):
        for x in range(40, im.size[0] - 40):
            r, g, b = px[x, y]
            if r > 190 and 60 < g < 150 and b < 90 and r - b > 120: xs.append(x); ys.append(y)
    return (sum(xs) // len(xs), sum(ys) // len(ys)) if xs else None

def crop(path, ref, off):
    im = Image.open(path).convert('RGB'); p = player(Image.open(ref))
    if not p: print('no player', ref, im.size)
    k = 1.41 if im.size[0] == 522 else 1.0
    if im.size[0] == 390: p = (194, 291)
    cx = p[0] + off[0] * k; cy = p[1] + off[1] * k
    c = im.crop((int(cx - 45 * k), int(cy - 35 * k), int(cx + 45 * k), int(cy + 25 * k)))
    return c.resize((int(90 * 3), int(60 * 3)), Image.NEAREST).convert('RGBA')

rows = []
for d0, lbl, off in ((S + 's/p10', 'meadow', (98, -95)), (S + 'sand/sand', 'sand', (98, 33))):
    for w in (390, 522):
        for sad in ('plain', 'saddled'):
            row = []
            for part in ('day', 'dusk', 'night'):
                row.append(crop('%s-%d-%s-0-%s.png' % (d0, w, sad, part), '%s-%d-%s-0-day.png' % (d0, w, sad), off))
            rows.append(('%s %d %s' % (lbl, w, sad), row))
cw2 = rows[0][1][0].size[0] + 6; ch2 = rows[0][1][0].size[1] + 18
p2 = Image.new('RGBA', (cw2 * 3, ch2 * len(rows)), (30, 30, 40, 255))
d2 = ImageDraw.Draw(p2)
for j, (n, row) in enumerate(rows):
    lab(d2, (4, j * ch2 + 3), n)
    for i, c in enumerate(row): p2.alpha_composite(c, (i * cw2 + 3, j * ch2 + 16))
W = max(p1.size[0], p2.size[0]); sheet = Image.new('RGBA', (W, p1.size[1] + p2.size[1] + 10), (30, 30, 40, 255))
sheet.alpha_composite(p1, (0, 0)); sheet.alpha_composite(p2, (0, p1.size[1] + 10))
sheet.convert('RGB').save(RUN + 'sheet.png'); print(sheet.size)
