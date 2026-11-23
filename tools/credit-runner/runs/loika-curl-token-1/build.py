import os, math
from PIL import Image
PAL = ['#0c0a12','#1a1725','#29253a','#3d3954','#5d5974','#8d8aa6','#c6c4d8','#f1ebdf','#ffffff','#f5e6c4','#e6c98c','#bf9157','#7d5435','#4b3023','#173b2d','#23623c','#329245','#5cbb4c','#98d85c','#d4f281']
L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
OUT = '/home/mb/mb/pool/loika-curl-token-1/tools/credit-runner/runs/loika-curl-token-1/frames/'
os.makedirs(OUT, exist_ok=True)
N = 32

def ell(cx, cy, rx, ry):
    return {(x, y) for y in range(N) for x in range(N) if ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1}

def base(saddle):
    g = [['.'] * N for _ in range(N)]
    body = ell(12.5, 24.0, 11.0, 8.4)
    head = ell(23.4, 24.0, 6.8, 6.4)
    fill = body | head
    for (x, y) in fill: g[y][x] = 'C'
    # slate shade on the lower rim of each mass and on the rump
    for (x, y) in fill:
        if (x, y + 1) not in fill or (x, y + 2) not in fill and y > 26: g[y][x] = 'D'
        if (x - 1, y) not in fill and y > 20: g[y][x] = 'D'
    # round tail curled in at the rump (left)
    for (x, y) in [(3,25),(3,26),(3,27),(4,28),(4,24),(4,26),(4,27)]:
        if (x, y) in fill: g[y][x] = 'D'
    # saddle (cream) on the back: only the saddled frames
    if saddle:
        for (x, y) in ell(10.5, 20.0, 6.8, 3.6):
            if (x, y) in body and (x, y - 1) in body and (x - 1, y) in body: g[y][x] = 'K'
    # face patch, closed eyes, muzzle
    for (x, y) in head:   # the head's own outline where it lies over the flank
        if any((x + dx, y + dy) in body and (x + dx, y + dy) not in head for dx, dy in ((-1, 0), (0, -1))) and y < 29: g[y][x] = 'A'
    for (x, y) in ell(25.0, 25.2, 4.0, 3.0):
        if (x, y) in head and g[y][x] != 'A': g[y][x] = 'L'
    for x in (22, 23): g[24][x] = 'B'      # her eye, a short dark line
    for x in (26, 27): g[24][x] = 'B'      # the far eye
    g[26][25] = 'D'; g[26][26] = 'D'       # nose
    # flat ears: slate tufts on the head's top corners
    for (x, y) in [(18,19),(19,18),(28,18),(29,19)]:
        if (x, y) in head: g[y][x] = 'D'
    # paws forward, tan
    for (x, y) in [(24,29),(25,29),(26,29),(27,29),(28,29),(29,29),(26,28),(27,28)]:
        if (x, y) in head: g[y][x] = 'L'
    # leaf crown on the head
    leaf = set()
    for (cx, cy, rx, ry) in [(23.0, 14.4, 2.4, 4.0), (19.6, 16.8, 2.4, 1.3), (18.3, 15.6, 1.4, 1.1), (26.6, 16.8, 2.4, 1.3), (27.9, 15.6, 1.4, 1.1)]:
        leaf |= ell(cx, cy, rx, ry)
    for (x, y) in leaf:
        if g[y][x] == '.' or (x, y) not in fill: g[y][x] = 'Q' if y < 16 else 'P'
    cl = leaf | fill
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
    # frame 1: the back (columns 3..16, above the head) rises 1 px; the bottom stays
    g = [list(r) for r in rows]
    new = [r[:] for r in g]
    for x in range(3, 17):
        col = [g[y][x] for y in range(N)]
        top = next((y for y in range(N) if col[y] != '.'), None)
        if top is None or top < 1: continue
        mid = 24
        for y in range(top - 1, mid): new[y][x] = col[y + 1]
        new[mid][x] = col[mid]
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
    if not sad:
        for r in f0: print(r)
open(OUT + 'rle.txt', 'w').write('\n'.join(txt) + '\n')
