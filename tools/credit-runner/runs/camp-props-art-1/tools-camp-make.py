import sys, os, importlib.util
s = importlib.util.spec_from_file_location('cp', '/home/mb/mb/camp-props-art-1/tools/credit-runner/runs/camp-props-art-1/tools-camp-png.py')
cp = importlib.util.module_from_spec(s); s.loader.exec_module(cp)

OUT = sys.argv[1]
os.makedirs(OUT + '/frames', exist_ok=True)
H = lambda x: (int(x[1:3], 16), int(x[3:5], 16), int(x[5:7], 16), 255)
OL = H('#141b1b')
PAL = {
    'c': H('#c8703f'), 'd': H('#9c5232'), 'l': H('#dd9559'),   # cloth: mid, shade, light
    'p': H('#e6dcc3'), 'q': H('#bfb399'),                       # pillow
    'm': H('#807c74'), 'n': H('#a5ac9c'),                       # lamp metal, metal light
    'g': H('#a5ac9c'),                                          # unlit glass
    'w': H('#4a3426'),                                          # lit glass dark behind the flame
    'f': H('#e46d3a'), 'y': H('#e9a73c'), 'h': H('#ffad5d'),    # flame: outer, mid, hot (the beacon's three)
}


def blank(w, h):
    return [[(0, 0, 0, 0)] * w for _ in range(h)]


def outline(px):
    h, w = len(px), len(px[0])
    out = [r[:] for r in px]
    for y in range(h):
        for x in range(w):
            if px[y][x][3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    a, b = x + dx, y + dy
                    if 0 <= a < w and 0 <= b < h and px[b][a][3]:
                        out[y][x] = OL
                        break
    return out


def paste(dst, src, ox, oy):
    for y, r in enumerate(src):
        for x, v in enumerate(r):
            if v[3]:
                dst[oy + y][ox + x] = v


def from_rows(rows):
    w = len(rows[0])
    for r in rows:
        assert len(r) == w, (r, w)
    return [[PAL[c] if c in PAL else (0, 0, 0, 0) for c in r] for r in rows]


# bedroll 19x7 inside, outline adds 1: pillow at the left, cloth with a fold line, a rolled strap at the right end
BED = [
    'pppqlllllllllllllll',
    'ppppccccccccccccldd',
    'pppqcccccccccccdddd',
    'ppqqddddddddddddddc',
    'pppqcccccccccccccld',
    'ppppcccccccccccccdd',
    'qqqqddddddddddddddd',
]
bed = outline([[(0, 0, 0, 0)] * 21] + [[(0, 0, 0, 0)] + r + [(0, 0, 0, 0)] for r in from_rows(BED)] + [[(0, 0, 0, 0)] * 21])
# trim the sharp corners a little so it reads as cloth, not a box
for (x, y) in ((0, 0), (20, 0), (0, 8), (20, 8)):
    bed[y][x] = (0, 0, 0, 0)

WIN = {
    'A': ['ggg', 'ggg', 'ggg', 'ggg'],
    'B': ['wfw', 'fyf', 'fhf', 'www'],
    'C': ['fww', 'wfw', 'fyf', 'fhf'],
}


def lamp(frame):
    win = WIN[frame]
    rows = ['..m..', 'mmmmm']
    for r in win:
        rows.append('n' + r + 'n')
    rows += ['mmmmm', 'm...m']
    return outline([[(0, 0, 0, 0)] * 7] + [[(0, 0, 0, 0)] + r + [(0, 0, 0, 0)] for r in from_rows(rows)] + [[(0, 0, 0, 0)] * 7])


def camp(frame):
    px = blank(32, 16)
    paste(px, bed, 0, 7)       # rows 7..15
    paste(px, lamp(frame), 23, 6)   # rows 6..15 (10 tall), beside the bedroll
    return px


frames = {'camp-a-unlit': camp('A'), 'camp-b-lit': camp('B'), 'camp-c-lit': camp('C'), 'bedroll': bed}
for k, v in frames.items():
    cp.write_png('%s/frames/%s.png' % (OUT, k), len(v[0]), len(v), v)
print('wrote', list(frames))
