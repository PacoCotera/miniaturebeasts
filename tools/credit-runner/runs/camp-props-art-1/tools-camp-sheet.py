import sys, importlib.util
s = importlib.util.spec_from_file_location('cp', '/home/mb/mb/camp-props-art-1/tools/credit-runner/runs/camp-props-art-1/tools-camp-png.py')
cp = importlib.util.module_from_spec(s); s.loader.exec_module(cp)
RUN = sys.argv[1]
PROPS = '/home/mb/mb/camp-props-art-1/prototypes/exploration/art/props/'


def load(p):
    w, h, px = cp.read_png(p)
    return px


def up(px, k):
    return [[v for v in r for _ in range(k)] for r in px for _ in range(k)]


def over(dst, src, ox, oy):
    for y, r in enumerate(src):
        for x, v in enumerate(r):
            if v[3] and 0 <= oy + y < len(dst) and 0 <= ox + x < len(dst[0]):
                dst[oy + y][ox + x] = v


def fill(w, h, c):
    return [[c + (255,)] * w for _ in range(h)]


items = [load(RUN + '/frames/' + n + '.png') for n in ('camp-a-unlit', 'camp-b-lit', 'camp-c-lit', 'bedroll')]
beacons = [load(PROPS + 'walk-beacon-unlit.png'), load(PROPS + 'walk-beacon-lit.png')]
GRASS, SAND = (98, 150, 86), (214, 196, 140)

# sheet: row 1 at 1x, row 2 at x4, on a grass strip
W, Hh = 720,10 + 44 + 10 + 4 * 46 + 10
sheet = fill(W, Hh, GRASS)
x = 8
for it in items:
    over(sheet, it, x, 10 + 44 - len(it)); x += len(it[0]) + 4
for b in beacons:
    over(sheet, b, x, 10); x += 24
y0 = 10 + 44 + 10
x = 8
for it in items + beacons:
    u = up(it, 4)
    if x + len(u[0]) > W:
        break
    over(sheet, u, x, y0 + 4 * 46 - len(u)); x += len(u[0]) + 8
cp.write_png(RUN + '/sheet.png', W, Hh, sheet)


# placed on meadow and sand, day / dusk / night, at walking zoom (x2), beside the beacon-style tile size of 32
def tint(px, k):
    flame = {(0xe4, 0x6d, 0x3a), (0xe9, 0xa7, 0x3c), (0xff, 0xad, 0x5d)}
    out = []
    for r in px:
        row = []
        for v in r:
            if v[:3] in flame or v[3] == 0:
                row.append(v)
            else:
                row.append((int(v[0] * k[0]), int(v[1] * k[1]), int(v[2] * k[2]), 255))
        out.append(row)
    return out


moods = [('day', (1, 1, 1)), ('dusk', (0.78, 0.66, 0.72)), ('night', (0.38, 0.45, 0.66))]
cells = []
for gname, g in (('meadow', GRASS), ('sand', SAND)):
    for mn, k in moods:
        bg = tuple(int(c * kk) for c, kk in zip(g, k))
        tile = fill(80, 56, bg)
        # a planted flag stand-in: a pole and pennant like the code-drawn icon (13x20)
        flag = [[(0, 0, 0, 0)] * 13 for _ in range(20)]
        for yy in range(1, 20):
            for xx in (1, 2):
                flag[yy][xx] = (0xe6, 0xdc, 0xc3, 255)
        for yy in range(1, 8):
            for xx in range(3, 12 - yy // 2 * 2):
                flag[yy][xx] = (0xd4, 0x68, 0x3b, 255)
        fl = tint(flag, k)
        over(tile, fl, 8, 56 - 20 - 4)
        frame = items[1] if mn != 'day' else items[0]
        over(tile, tint(frame, k), 22, 56 - 16 - 3)
        cells.append(up(tile, 2))
cw, ch = len(cells[0][0]), len(cells[0])
S2 = fill(cw * 3, ch * 2, (20, 27, 27))
for i, c in enumerate(cells):
    over(S2, c, (i % 3) * cw, (i // 3) * ch)
cp.write_png(RUN + '/placed.png', cw * 3, ch * 2, S2)
print('ok')
