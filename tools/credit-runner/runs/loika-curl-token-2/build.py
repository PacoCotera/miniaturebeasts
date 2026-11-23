import os, math
from PIL import Image
PAL = ['#0c0a12','#1a1725','#29253a','#3d3954','#5d5974','#8d8aa6','#c6c4d8','#f1ebdf','#ffffff','#f5e6c4','#e6c98c','#bf9157','#7d5435','#4b3023','#173b2d','#23623c','#329245','#5cbb4c','#98d85c','#d4f281']
L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
OUT = '/home/mb/mb/pool/loika-curl-token-2/tools/credit-runner/runs/loika-curl-token-2/frames/'
os.makedirs(OUT, exist_ok=True)
N = 32
HC = (10.6, 26.8, 10.0, 10.6)

def ell(cx, cy, rx, ry):
    return {(x, y) for y in range(N) for x in range(N) if ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1}

def rad(x, y):
    return math.sqrt(((x + .5 - HC[0]) / HC[2]) ** 2 + ((y + .5 - HC[1]) / HC[3]) ** 2)

def base(saddle):
    g = [['.'] * N for _ in range(N)]
    body = {(x, y) for (x, y) in ell(*HC) if y <= 29}
    head = {(x, y) for (x, y) in ell(23.0, 23.8, 6.3, 5.8) if y <= 29}
    fill = body | head
    for (x, y) in fill: g[y][x] = 'C'
    # slate shade: underside of both masses, and the rear rim
    for (x, y) in fill:
        if (x, y + 1) not in fill and y >= 27: g[y][x] = 'D'
        if (x, y + 2) not in fill and y >= 27 and (x, y) in body: g[y][x] = 'D'
        if (x - 1, y) not in fill and y > 21: g[y][x] = 'D'
    # tail: a slate band wrapped round the rear end, its tip lying over the hind foot
    for (x, y) in [(13, 28), (14, 28), (15, 28), (14, 29), (15, 29), (16, 29), (16, 28)]:
        if (x, y) in body: g[y][x] = 'L'
    tail = {(x, y) for (x, y) in body if 0.72 <= rad(x, y) <= 0.97 and x <= 12 and y >= 21}
    for (x, y) in tail: g[y][x] = 'E' if y < 27 else 'D'
    for (x, y) in body:   # dark line on the tail's inner edge so the wrap reads
        if 0.67 <= rad(x, y) < 0.74 and x <= 12 and y >= 22: g[y][x] = 'A'
    # saddle: cream patch that follows the hump's curve (round top, hangs low at the sides)
    if saddle:
        sad = ell(10.4, 19.6, 7.2, 6.4)
        for (x, y) in body:
            if rad(x, y) <= 0.97 and 4 <= x <= 17 and y >= 16 and y <= 25.5 - 0.1 * (x - 10.5) ** 2 and g[y][x] in 'CD': g[y][x] = 'K'
    # the head's own outline where it lies over the hump
    for (x, y) in head:
        if any((x + dx, y + dy) in body and (x + dx, y + dy) not in head for dx, dy in ((-1, 0), (0, -1), (-1, -1))) and y < 29:
            g[y][x] = 'A'
    # tan face patch low on the head, muzzle forward
    for (x, y) in ell(24.4, 26.0, 4.6, 3.3):
        if (x, y) in head and g[y][x] != 'A': g[y][x] = 'L'
    # closed eyes: short dark lines
    for x in (21, 22): g[24][x] = 'B'
    for x in (26, 27): g[24][x] = 'B'
    g[26][28] = "D"; g[26][29] = "D"       # nose
    # flat ears: slate tufts on the head's top corners
    for (x, y) in [(19, 20), (20, 19), (27, 19), (28, 20)]:
        if (x, y) in head: g[y][x] = 'D'
    # front paws under the chin, reaching forward
    for y in (28, 29):
        for x in range(20, 31):
            if (x, y) in head or (y == 28 and x in (29, 30)) or (y == 29 and x in (29, 30)):
                g[y][x] = 'L'
    for x in (22, 25, 28): g[29][x] = 'D'   # toe gaps
    g[28][21] = 'D'; g[28][30] = 'D'
    # leaf crown on the head, not the body
    leaf = set()
    for (cx, cy, rx, ry) in [(22.6, 15.4, 2.4, 2.6), (22.8, 18.0, 5.4, 1.8), (18.4, 16.6, 1.3, 1.0), (27.4, 16.6, 1.3, 1.0)]:
        leaf |= ell(cx, cy, rx, ry)
    for (x, y) in leaf:
        if g[y][x] == '.' or (x, y) not in fill: g[y][x] = 'Q' if y < 17 else 'P'
    # outline every empty pixel touching a filled one
    out = [r[:] for r in g]
    for y in range(N):
        for x in range(N):
            if g[y][x] == '.':
                for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < N and 0 <= yy < N and g[yy][xx] != '.': out[y][x] = 'A'; break
    return [''.join(r) for r in out]

def breathe(rows):
    # frame 1: the hump (columns 3..16) rises 1 px; the bottom stays
    g = [list(r) for r in rows]
    new = [r[:] for r in g]
    for x in range(3, 17):
        col = [g[y][x] for y in range(N)]
        top = next((y for y in range(N) if col[y] != '.'), None)
        if top is None or top < 1: continue
        for y in range(top - 1, 24): new[y][x] = col[y + 1]
        new[24][x] = col[24]
    return [''.join(r) for r in new]

def rle(rows):
    s = ''.join(rows); out = []; i = 0
    while i < len(s):
        j = i
        while j < len(s) and s[j] == s[i]: j += 1
        out.append(s[i] + (str(j - i) if j - i > 1 else '')); i = j
    return ''.join(out)

def rgb(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
def png(rows, path):
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c != '.': im.putpixel((x, y), rgb(PAL[L.index(c)]) + (255,))
    im.save(path)

txt = []
for name, sad in (('plain', False), ('saddled', True)):
    f0 = base(sad); f1 = breathe(f0)
    for i, f in enumerate((f0, f1)):
        png(f, OUT + 'loika-s01-idle-right-%s-curl-%d.png' % (name, i))
        txt.append('%s-curl-%d: %s' % (name, i, rle(f)))
    if sad:
        for y, r in enumerate(f0): print('%2d %s' % (y, r))
open(OUT + 'rle.txt', 'w').write('\n'.join(txt) + '\n')
