"""A tracing guide for the round 2 emblems: tapered strokes (1 px tips, 2 px body) walked along curves, printed as text.
Its output is only a starting point: the final emblems are the hand-edited text files in source/, which build.py reads; this script is never the final."""
import math, sys
N = 24
def bez(p0, p1, p2, p3, n=200): return [tuple((1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d for a, b, c, d in zip(p0, p1, p2, p3)) for t in [i / n for i in range(n + 1)]]
def line(p, q, n=100): return [(p[0] + (q[0] - p[0]) * i / n, p[1] + (q[1] - p[1]) * i / n) for i in range(n + 1)]
def poly(ps): return [pt for a, b in zip(ps, ps[1:]) for pt in line(a, b)]
def arc(cx, cy, rx, ry, a0, a1, n=200): return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]
def stroke(g, pts, taper=2.0, body=2):
    n = len(pts); L = sum(math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) for i in range(n - 1)); acc = 0
    for i in range(n - 1):
        x, y = pts[i]; dx, dy = pts[i + 1][0] - x, pts[i + 1][1] - y; acc += math.hypot(dx, dy)
        w = 1 if (acc < taper or L - acc < taper) else body
        ix, iy = int(math.floor(x)), int(math.floor(y))
        if 0 <= ix < N and 0 <= iy < N: g[iy][ix] = 1
        if w == 2:
            ox, oy = (1, 0) if abs(dy) > abs(dx) else (0, 1)
            if 0 <= ix + ox < N and 0 <= iy + oy < N: g[iy + oy][ix + ox] = 1
def new(): return [[0] * N for _ in range(N)]
def dot(g, x, y, w=2):
    for a in range(w):
        for b in range(w): g[y + b][x + a] = 1
def text(g, lit=True):
    out = []
    for y in range(N):
        row = ''
        for x in range(N):
            if g[y][x]: row += '+' if (x == 0 or not g[y][x - 1] or y == 0 or not g[y - 1][x]) else '#'
            else: row += '.'
        out.append(row)
    return '\n'.join(out)
D = {}
# coat: a lock of three combed strokes, tips tapered
g = new(); stroke(g, bez((4, 22), (3, 15), (6, 9), (9, 3)), 2.5); stroke(g, bez((10, 22), (9, 14), (12, 8), (16, 2)), 2.5); stroke(g, bez((16, 22), (15, 16), (17, 12), (20, 7)), 2.5); D['coat'] = g
# face: a brow arc, an almond eye (two lids meeting in corners), a 2x2 pupil
g = new(); stroke(g, bez((3, 9), (6, 3), (17, 3), (20, 9)), 2.5); stroke(g, bez((2, 17), (7, 11), (16, 11), (21, 17)), 2.5); stroke(g, bez((2, 17), (7, 22), (16, 22), (21, 17)), 2.5); dot(g, 11, 15); D['face'] = g
# shape: a resting body from the side: the face line up to the ear tip, ONE long back arc over to the rump, a flat base
g = new(); stroke(g, poly([(3, 20), (3, 12), (5, 3)]), 1.5); stroke(g, poly([(5, 3), (7, 8)]), 0.8); stroke(g, bez((7, 8), (10, 3), (21, 3), (21, 17)), 2.5); stroke(g, line((3, 20), (21, 20)), 2.5); stroke(g, line((21, 15), (21, 20)), 0.5); D['shape'] = g
# legs and tail: the hind leg (thigh swell, hock) ends in a 2 px foot turned forward; the tail is a separate curl behind
g = new(); stroke(g, bez((10, 2), (4, 7), (12, 11), (7, 16)), 2.5); stroke(g, poly([(7, 16), (7, 20), (3, 20)]), 1.0); stroke(g, bez((13, 20), (21, 21), (23, 11), (18, 8)), 2.5); stroke(g, bez((18, 8), (14, 5), (13, 13), (17, 12)), 2.0); D['legs-tail'] = g
# movement: two larger prints on a diagonal step; each a ring pad about 6x7 with two toe nicks
PAD = [".XXXX.", "XXXXXX", "XXXXXX", "XXXXXX", "XXXXXX", "XXXXXX", ".XXXX."]
def paw(g, x, y):
    for j, row in enumerate(PAD):
        for i, ch in enumerate(row):
            if ch == "X": g[y + j][x + i] = 1
    for tx in (x + 1, x + 4): g[y - 3][tx] = 1; g[y - 2][tx] = 1          # two toe nicks
g = new(); paw(g, 3, 15); paw(g, 14, 7); D['movement'] = g
# stamina: a long rising wave, the full 22 px, ending in a separate 2x2 dot
g = new(); stroke(g, bez((1, 19), (7, 11), (11, 22), (18, 10)), 2.5); dot(g, 20, 6); D['stamina'] = g
# character: the ear in one curve (outer edge, tip, inner edge) and a short arc of the head at its base
g = new(); stroke(g, bez((6, 18), (5, 9), (10, 3), (17, 1)), 2.5); stroke(g, bez((17, 1), (17, 7), (19, 12), (18, 18)), 2.0); stroke(g, bez((2, 23), (6, 15), (18, 15), (22, 23)), 2.2); D['character'] = g
# glow: a dot in a ring broken three times
g = new()
for a0 in (12, 132, 252): stroke(g, arc(12, 12, 9, 9, a0, a0 + 92), 1.5)
dot(g, 11, 11); D['glow'] = g
# charge: one angular spark with a branch
g = new(); stroke(g, poly([(15, 1), (7, 11), (16, 12), (8, 22)]), 2.0); stroke(g, poly([(16, 12), (21, 9)]), 1.0); D['charge'] = g
if __name__ == '__main__':
    for k in D:
        print(k); print('    ' + ''.join(str(i % 10) for i in range(24)))
        for i, r in enumerate(text(D[k]).split('\n')): print(f'{i:2d}  {r}')
