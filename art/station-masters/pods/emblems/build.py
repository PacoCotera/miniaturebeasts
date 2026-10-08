"""Chapter emblems, round 1: two options per chapter, drawn at 24x24 on the Station palette (62 colours), never reduced.

usage:  python3 -I build.py            (from anywhere)
Writes  round1/emblems-sheet.png       indexed sheet: nine chapters by option A and B in unread, read and sealed (PLTE = the 62 colours in file order,
                                       index 62 transparent), round1/emblems-atlas.json (rects, colours, hashes), round1/contact-1x.png, contact-2x.png

Standard library only. The manner: one 2 px cut, at most three strokes, 1 px inner detail only where it reads at 1x; the lit edge (top and left)
one palette step lighter; no fill, no outline, no glow. Unread: mist with a fog edge. Read: bone with a white edge. Sealed: mist, flat.
Pixels are palette colours or empty: nothing can be off palette, there is no anti-aliasing and no dither.
"""
import json, math, os, struct, zlib, hashlib
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "round1")
PAL = json.load(open(os.path.join(HERE, "..", "..", "..", "..", "prototypes", "ui", "palettes", "station.json")))
NAMES = [n for n, _ in PAL["colours"]]; RGB = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for _, h in PAL["colours"]]
LIGHTER = PAL["lighter"]; N = 24; T = 62
STATES = {"unread": ("mist", True), "read": ("bone", True), "sealed": ("mist", False)}   # colour, lit edge

# ---------- a tiny stroke rasteriser: a 2x2 brush walked along polylines and arcs
def pts_line(p, q, step=0.25):
    n = max(1, int(math.hypot(q[0] - p[0], q[1] - p[1]) / step)); return [(p[0] + (q[0] - p[0]) * i / n, p[1] + (q[1] - p[1]) * i / n) for i in range(n + 1)]
def pts_poly(ps): return [pt for a, b in zip(ps, ps[1:]) for pt in pts_line(a, b)]
def pts_arc(cx, cy, rx, ry, a0, a1, step=0.25):
    n = max(2, int(abs(a1 - a0) / 360 * 2 * math.pi * max(rx, ry) / step)); return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]
def pts_bez(p0, p1, p2, p3, n=80):
    return [tuple((1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d for a, b, c, d in zip(p0, p1, p2, p3)) for t in [i / n for i in range(n + 1)]]
def brush(mask, pts):
    for x, y in pts:
        ix, iy = int(math.floor(x)), int(math.floor(y))
        for dx in (0, 1):
            for dy in (0, 1):
                if 0 <= ix + dx < N and 0 <= iy + dy < N: mask[iy + dy][ix + dx] = 1
def dot(mask, x, y, w=2):
    for dx in range(w):
        for dy in range(w): mask[y + dy][x + dx] = 1
def empty(): return [[0] * N for _ in range(N)]

# ---------- the nine motifs, two options each. Strokes in `cut` (2 px), detail in `fine` (1 px, base colour only).
def outline_of(fill_fn, width=2):
    """A closed contour as a 2 px cut: the inner boundary band of a filled shape."""
    fill = [[1 if fill_fn(x + 0.5, y + 0.5) else 0 for x in range(N)] for y in range(N)]
    def inside(m, x, y): return 0 <= x < N and 0 <= y < N and m[y][x]
    cur = fill
    for _ in range(width):
        cur = [[1 if cur[y][x] and all(inside(cur, x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))) else 0 for x in range(N)] for y in range(N)]
    return [[1 if fill[y][x] and not cur[y][x] else 0 for x in range(N)] for y in range(N)]
def ell(x, y, cx, cy, rx, ry): return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
def coat(opt):
    c, f = empty(), empty()
    if opt == "A":       # a lock of three combed fur strokes, leaning together, three lengths
        brush(c, pts_bez((4, 22), (3, 15), (6, 9), (9, 3))); brush(c, pts_bez((10, 22), (9, 14), (12, 8), (16, 2))); brush(c, pts_bez((16, 22), (15, 16), (17, 12), (20, 7)))
    else:                # three strands splaying from a low root
        brush(c, pts_bez((8, 22), (6, 16), (4, 10), (3, 4))); brush(c, pts_bez((12, 22), (12, 15), (12, 9), (12, 2))); brush(c, pts_bez((16, 22), (18, 16), (20, 10), (21, 4)))
    return c, f
def face(opt):
    c, f = empty(), empty()
    brush(c, pts_arc(12, 14, 10, 9, 220, 320))            # the brow arc, high
    if opt == "A":       # an almond eye well below it
        brush(c, pts_bez((3, 17), (8, 12), (16, 12), (21, 17))); brush(c, pts_bez((3, 17), (8, 22), (16, 22), (21, 17))); dot(c, 11, 16, 2)
    else:                # a round eye
        brush(c, pts_arc(12, 17, 5.5, 5.5, 0, 360)); dot(f, 11, 16, 2)
    return c, f
def shape(opt):
    c, f = empty(), empty()
    if opt == "A":       # the pod's egg: wider below, tapering up
        c = outline_of(lambda x, y: ell(x, y, 12, 14, 9.5 - 3.5 * max(0, (14 - y)) / 11, 8.5) if y > 3 else False) if False else outline_of(lambda x, y: (y > 2.5 and abs(x - 12) <= (9.5 * math.sqrt(max(0, 1 - ((y - 14.5) / 11.5) ** 2))) * (0.55 + 0.45 * (y - 2.5) / 20)))
    else:                # a body with its head and rump: the union of three ovals, as one closed contour
        c = outline_of(lambda x, y: ell(x, y, 13, 14, 8.5, 6) or ell(x, y, 5, 9, 3.5, 3.5) or ell(x, y, 21, 12, 2.5, 3))
    return c, f
def legs_tail(opt):
    c, f = empty(), empty()
    if opt == "A":       # a hind leg (the thigh's swell, the hock, the foot) and a tail curl
        brush(c, pts_bez((8, 2), (2, 9), (11, 12), (6, 17))); brush(c, pts_poly([(6, 17), (7, 21), (11, 21)])); brush(c, pts_bez((13, 21), (21, 21), (23, 11), (18, 8))); brush(c, pts_bez((18, 8), (14, 6), (13, 11), (17, 12)))
    else:                # a straighter hind leg and a long S tail
        brush(c, pts_poly([(5, 3), (10, 10), (6, 15), (7, 21), (12, 21)])); brush(c, pts_bez((13, 12), (19, 14), (17, 5), (22, 5)))
    return c, f
def movement(opt):
    c, f = empty(), empty()
    def paw(x, y):       # a pad (a 2 px cut) and two toes
        brush(c, pts_line((x, y + 2), (x + 1, y + 4), 0.2)); f[y][x - 1] = 1; f[y][x + 2] = 1; f[y - 1][x] = 1; f[y - 1][x + 1] = 1
    if opt == "A":       # three prints stepping up a stride arc (the arc a 1 px detail under them)
        for (x, y) in ((4, 17), (10, 12), (17, 7)): paw(x, y)
        for p in pts_arc(12, 22, 10, 12, 200, 320, 0.7): f[int(p[1])][int(p[0])] = 1
    else:                # three prints, larger, level apart
        for (x, y) in ((3, 17), (10, 13), (17, 8)): paw(x, y)
    return c, f
def stamina(opt):
    c, f = empty(), empty()
    if opt == "A":       # a long breath line, one wave, ending in a dot
        brush(c, pts_bez((2, 15), (7, 6), (12, 21), (17, 12))); dot(c, 19, 10, 3)
    else:                # a breath that rises, falls and settles into its dot
        brush(c, pts_bez((2, 17), (8, 17), (8, 7), (14, 7))); brush(c, pts_bez((14, 7), (20, 7), (19, 16), (14, 16))); dot(c, 9, 15, 3)
    return c, f
def character(opt):
    c, f = empty(), empty()
    if opt == "A":       # a pricked ear: a pointed outline with concave sides, and its cup
        brush(c, pts_bez((5, 22), (6, 13), (9, 6), (13, 2))); brush(c, pts_bez((13, 2), (17, 8), (19, 14), (19, 22))); brush(c, pts_line((5, 22), (19, 22), 0.3)); [f[y].__setitem__(x, 1) for y, x in [(9, 13), (10, 13), (11, 13), (12, 14), (13, 14), (14, 14)]]
    else:                # an ear in one curve with its cup line
        brush(c, pts_bez((4, 22), (3, 10), (10, 3), (16, 2))); brush(c, pts_bez((16, 2), (14, 10), (18, 16), (20, 22))); [f[y].__setitem__(x, 1) for y, x in [(11, 13), (12, 13), (13, 13), (14, 14), (15, 14)]]
    return c, f
def glow(opt):
    c, f = empty(), empty()
    if opt == "A":       # a dot in a ring broken at the upper right
        brush(c, pts_arc(12, 12, 8, 8, 20, 285)); dot(c, 11, 11, 2)
    else:                # a dot in a ring broken three times (never a star)
        for a0 in (10, 130, 250): brush(c, pts_arc(12, 12, 8, 8, a0, a0 + 90))
        dot(c, 11, 11, 2)
    return c, f
def charge(opt):
    c, f = empty(), empty()
    if opt == "A":       # one angular spark: a thin zig of three cuts
        brush(c, pts_poly([(15, 2), (7, 11), (16, 12), (8, 22)]))
    else:                # an angular spark with one short branch
        brush(c, pts_poly([(14, 2), (8, 10), (15, 13), (9, 22)])); brush(c, pts_poly([(15, 13), (20, 11)]))
    return c, f
CHAPTERS = [("coat", "Coat", coat), ("face", "Face", face), ("shape", "Shape", shape), ("legs-tail", "Legs & tail", legs_tail), ("movement", "Movement", movement), ("stamina", "Stamina", stamina), ("character", "Character", character), ("glow", "Glow", glow), ("charge", "Charge", charge)]

def render(cut, fine, state):
    base, lit = STATES[state]; bi = NAMES.index(base); li = NAMES.index(LIGHTER[base]); g = [[T] * N for _ in range(N)]
    for y in range(N):
        for x in range(N):
            if fine[y][x] and not cut[y][x]: g[y][x] = bi
            if cut[y][x]:
                edge = lit and (x == 0 or not cut[y][x - 1] or y == 0 or not cut[y - 1][x])
                g[y][x] = li if edge else bi
    return g

# ---------- indexed PNG writer (standard library)
def png(path, w, h, rows, palette=True):
    def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    raw = b"".join(b"\x00" + bytes(r) for r in rows)
    plte = b"".join(bytes(c) for c in RGB) + bytes((0, 0, 0)); trns = bytes([255] * 62 + [0])
    open(path, "wb").write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 3, 0, 0, 0)) + chunk(b"PLTE", plte) + chunk(b"tRNS", trns) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
def scale(rows, k): return [[v for v in r for _ in range(k)] for r in rows for _ in range(k)]

def main():
    os.makedirs(OUT, exist_ok=True); GAP = 2; cols = [(o, s) for o in "AB" for s in STATES]
    W = len(cols) * (N + GAP) + GAP; H = len(CHAPTERS) * (N + GAP) + GAP; sheet = [[T] * W for _ in range(H)]; atlas = {}
    for r, (cid, word, fn) in enumerate(CHAPTERS):
        for k, (o, s) in enumerate(cols):
            cut, fine = fn(o); g = render(cut, fine, s); x0 = GAP + k * (N + GAP); y0 = GAP + r * (N + GAP)
            for y in range(N): sheet[y0 + y][x0:x0 + N] = g[y]
            atlas[f"rail-emblem-{cid}-{o.lower()}-{s}-24x24"] = {"rect": [x0, y0, N, N], "sha256": hashlib.sha256(bytes(v for row in g for v in row)).hexdigest()}
    png(os.path.join(OUT, "emblems-sheet.png"), W, H, sheet)
    png(os.path.join(OUT, "contact-1x.png"), W, H, sheet); png(os.path.join(OUT, "contact-2x.png"), W * 2, H * 2, scale(sheet, 2))
    json.dump({"palette": {"file": "prototypes/ui/palettes/station.json", "colours": 62, "transparentIndex": 62}, "columns": [f"{o}-{s}" for o, s in cols], "rows": [c[0] for c in CHAPTERS], "sprites": atlas, "status": "round 1: two options per chapter, for the art director's picks"}, open(os.path.join(OUT, "emblems-atlas.json"), "w"), indent=1)
    print("sheet", W, H, len(atlas), "sprites")
if __name__ == "__main__": main()
