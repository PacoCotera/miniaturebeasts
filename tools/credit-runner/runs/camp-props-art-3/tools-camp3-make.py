import sys, os, math, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
s = importlib.util.spec_from_file_location('cp', HERE + '/tools-camp-png.py')
cp = importlib.util.module_from_spec(s); s.loader.exec_module(cp)

OUT = sys.argv[1]
os.makedirs(OUT + '/frames', exist_ok=True)
H = lambda x: (int(x[1:3], 16), int(x[3:5], 16), int(x[5:7], 16), 255)
T = (0, 0, 0, 0)
OL = H('#141b1b')
# cloth from the game palette (mist/fog/stone/bone); lantern red-brown from the signed night card; flame = the beacon's three
CLOTH, CLOTH_L, CLOTH_D, FOLD = H('#8d8aa6'), H('#a9a7c0'), H('#5d5974'), H('#dcdaea')
PIL, PIL_D = H('#f1ebdf'), H('#c6c4d8')
LAN, LAN_L, LAN_D = H('#602728'), H('#924a27'), H('#3d1218')
GLASS_OFF = H('#a5ac9c')
FLAME = {'f': H('#e46d3a'), 'y': H('#e9a73c'), 'h': H('#ffad5d')}
GLOW = H('#4a2218')   # lit glass behind the flame


def blank(w, h):
    return [[T] * w for _ in range(h)]


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


# ---- bedroll: a blanket laid flat, about 2 tiles x 1 (62 x 26 inside), pillow end at the LEFT, wavy soft edge
W, Hh = 62, 26


def bedroll():
    px = blank(W + 2, Hh + 2)
    cy = (Hh - 1) / 2.0
    for y in range(Hh):
        for x in range(W):
            top = 2.0 + 1.6 * math.sin(x * 0.26) + 0.45 * math.sin(x * 0.9 + 0.7)
            bot = 2.0 + 1.6 * math.sin(x * 0.23 + 2.1) + 0.45 * math.sin(x * 0.8)
            lo, hi = top, Hh - 1 - bot
            inside = lo <= y <= hi
            half = (hi - lo) / 2 + 0.5
            rl, rr = 10.0, 8.0     # rounded ends: wide pillow end, softer foot end
            if x < rl:
                dx = rl - x - 0.5
                inside = inside and (dx * dx / (rl * rl) + (y - cy) ** 2 / (half * half)) <= 1.0
            if x > W - 1 - rr:
                dx = x - (W - 1 - rr) + 0.5
                inside = inside and (dx * dx / (rr * rr) + (y - cy) ** 2 / (half * half)) <= 1.0
            if inside:
                px[y + 1][x + 1] = CLOTH
    # shading: the lower side darker (the blanket sags away), a few soft creases
    for y in range(Hh):
        for x in range(W):
            if px[y + 1][x + 1] != CLOTH:
                continue
            if y >= Hh - 6 and x > 12:
                px[y + 1][x + 1] = CLOTH_D
            elif y >= Hh - 8 and x > 12 and (x + y) % 2 == 0:
                px[y + 1][x + 1] = CLOTH_D
            elif (x + 2 * y) % 13 == 0 and 8 < y < Hh - 8 and x > 18:
                px[y + 1][x + 1] = CLOTH_L
                if x + 1 < W and px[y + 1][x + 2] == CLOTH:
                    px[y + 1][x + 2] = CLOTH_L
    # the folded-down top edge: a light band along the top, a shadow line under it
    for x in range(18, W - 6):
        first = None
        for y in range(Hh):
            if px[y + 1][x + 1][3]:
                first = y
                break
        for k in range(6):
            if px[first + k + 1][x + 1][3]:
                px[first + k + 1][x + 1] = FOLD
        if px[first + 6 + 1][x + 1][3]:
            px[first + 6 + 1][x + 1] = CLOTH_D
        if px[first + 7 + 1][x + 1][3] and (x % 2 == 0):
            px[first + 7 + 1][x + 1] = CLOTH_D
    # the pillow: a bone oval at the left end, shaded underneath
    pc, pr = (10.0, cy), (9.0, 9.5)
    for y in range(Hh):
        for x in range(0, 22):
            d = ((x - pc[0]) / pr[0]) ** 2 + ((y - pc[1]) / pr[1]) ** 2
            if d <= 1.0 and px[y + 1][x + 1][3]:
                px[y + 1][x + 1] = PIL_D if (d > 0.62 and (y > cy + 1 or x < 4)) else PIL
    return outline(px)


# ---- the lantern: red-brown frame like the night card's, 11 wide, ring handle, glass window, flame
GL_W, GL_H = 5, 8


def lantern(frame):
    g = [[''] * GL_W for _ in range(GL_H)]
    for y in range(GL_H):
        for x in range(GL_W):
            if frame == 'A':
                g[y][x] = 'g'
            else:
                g[y][x] = 'w'
    if frame in 'BC':
        # a flame, a tall teardrop: outer, mid, hot core; frame C leans the tip one pixel
        lean = 1 if frame == 'C' else 0
        for (y, x0, x1, c) in ((1, 2, 2, 'f'), (2, 2, 2, 'f'), (3, 1, 3, 'f'), (4, 1, 3, 'y'), (5, 1, 3, 'y'), (6, 2, 2, 'h'), (7, 1, 3, 'f')):
            pass
        shape = [(1, 2, 2, 'f'), (2, 1, 3, 'f'), (3, 1, 3, 'y'), (4, 1, 3, 'y'), (5, 1, 3, 'h'), (6, 2, 2, 'h')]
        for (y, x0, x1, c) in shape:
            sh = lean if y <= 2 else 0
            for x in range(x0, x1 + 1):
                if 0 <= x + sh < GL_W:
                    g[y][x + sh] = c
        for x in range(1, 4):
            g[GL_H - 1][x] = 'f' if frame == 'B' else 'y'
    col = {'g': GLASS_OFF, 'w': GLOW, **FLAME}
    w = GL_W + 4
    rows = []
    rows.append([None] * 4 + ['L'] + [None] * 4)
    rows.append([None] * 3 + ['L', None, 'L'] + [None] * 3)
    rows.append([None] * 2 + ['d'] * 5 + [None] * 2)
    rows.append([None] + ['d'] * 7 + [None])
    rows.append([None] + ['d', 'L'] + ['d'] * 3 + ['L', 'd'] + [None] * 0)
    for y in range(GL_H):
        rows.append([None, 'm', 'l'] + [('G', g[y][x]) for x in range(GL_W - 2)] + ['m'] if False else None)
    rows = rows[:4]
    for y in range(GL_H):
        rows.append(['m'] + [('G', g[y][x]) for x in range(GL_W)] + ['m'] + [None] * 0 + [None] * 2)
    # normalise width to 9: m + 5 glass + m = 7; centre in 9
    out = []
    for r in rows[:4]:
        out.append(r)
    px = blank(11, len(rows) + 4)
    # draw header rows (centred in 9 wide)
    hdr = [[None] * 4 + ['L'] + [None] * 4,
           [None] * 3 + ['L', None, 'L'] + [None] * 3,
           [None] * 2 + ['d'] * 5 + [None] * 2,
           [None] + ['d'] * 7 + [None]]
    cmap = {'L': LAN_L, 'd': LAN, 'm': LAN, 'x': LAN_D}
    y = 0
    for r in hdr:
        for x, c in enumerate(r):
            if c:
                px[y + 1][x + 1 + 0] = cmap[c]
        y += 1
    # body: 9 wide = post(1) + glass(5) + post(1) + 1 margin each side handled via offset 1
    for gy in range(GL_H):
        yy = y + gy
        px[yy + 1][1 + 1] = LAN
        px[yy + 1][1 + 7] = LAN
        px[yy + 1][1 + 1] = LAN_L if gy < GL_H - 1 else LAN
        for gx in range(GL_W):
            px[yy + 1][1 + 2 + gx] = col[g[gy][gx]]
        px[yy + 1][1 + 1 + 1 + GL_W] = LAN
    y += GL_H
    for x in range(0, 9):
        px[y + 1][1 + x] = LAN if 0 < x < 8 else T
    y += 1
    for x in (1, 7):
        px[y + 1][1 + x] = LAN_D
    return outline(px)


# ---- round 3: a blanket LAID FLAT, seen from above: 32 x 16 inside (about her height long, half that wide at the 48 art grid),
# dull red quilt, cream pillow at the LEFT end, the far-right top corner turned back to show a lighter lining, 1 px dark outline.
QW, QH = 32, 16
Q, Q_L, Q_D = H('#9b4f48'), H('#b3675c'), H('#76393b')
STITCH = H('#c99a55')                      # ochre quilt stitching
LINING, LINING_D = H('#ecd9c3'), H('#cdb59a')
PILLOW, PILLOW_D = H('#f1ebdf'), H('#cfc4ae')


def bedroll():
    px = blank(QW + 2, QH + 2)
    for y in range(QH):
        for x in range(QW):
            # soft rectangle: the four corners rounded off by one pixel
            if (x in (0, QW - 1)) and (y in (0, QH - 1)):
                continue
            c = Q
            if y >= QH - 3:
                c = Q_D                    # the lower edge in shade
            elif y <= 1:
                c = Q_L                    # the far edge catches the light
            elif x >= 8 and (x - 8) % 6 == 3 and 2 <= y <= QH - 4:
                c = STITCH if y % 2 == 0 else Q   # ochre stitch lines across the quilt, dashed
            elif x >= 8 and y == 8 and x % 3 != 0:
                c = Q_L                    # one soft crease along the length
            px[y + 1][x + 1] = c
    # the turned-back corner: a triangle at the top-right, lining lighter, a dark fold line on its diagonal
    n = 7
    for k in range(n):
        for j in range(n - k):
            x, y = QW - 1 - j, k
            px[y + 1][x + 1] = LINING
    for k in range(n):
        x, y = QW - n + k, k + 0
        if 0 <= x < QW and px[y + 1][x + 1][3]:
            px[y + 1][x + 1] = LINING_D
    # the pillow at the left end: a cream rounded rectangle, 8 x 10, shaded along its lower side
    for y in range(3, QH - 3):
        for x in range(1, 9):
            if (x in (1, 8)) and (y in (3, QH - 4)):
                continue
            px[y + 1][x + 1] = PILLOW_D if (y >= QH - 5 or x == 1) else PILLOW
    return outline(px)


bed = bedroll()
LAMP_GAP = 2
CAMP_H = len(bed)


def camp(frame):
    lam = lantern(frame)
    lw = len(lam[0])
    px = blank(lw + LAMP_GAP + len(bed[0]), CAMP_H)
    paste(px, bed, lw + LAMP_GAP, 0)
    paste(px, lam, 0, CAMP_H - len(lam))   # the lantern stands beside the pillow end (left), its foot on the bedroll's foot line
    return px


frames = {'camp-a-unlit': camp('A'), 'camp-b-lit': camp('B'), 'camp-c-lit': camp('C'), 'bedroll': bed}
for k, v in frames.items():
    cp.write_png('%s/frames/%s.png' % (OUT, k), len(v[0]), len(v), v)
print('wrote', {k: (len(v[0]), len(v)) for k, v in frames.items()})
