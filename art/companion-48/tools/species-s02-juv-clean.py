"""The C0 S02 (Untuva) juvenile Companion tokens, round 2 (the AD's direction art/companion-48/species/S02/juv-direction/ @ 4ba9b28e): the silhouette is the AD's target mask (idle-silhouette-32x32.txt: about
21 wide and 23 high, rows 9 to 31: a low cap dome on rows 9 to 13, the brim shadow row 14 one px wider than the body, a round ball rows 15 to 29 narrowing from row 24, a 4 x 4 bun at the back, four stubby feet).
The mask's outline is its boundary (ink); the cap's three tones (clay, sand, paper, lit top-left), the soil shadow row under the brim (seated, no ink between cap and head), the ball's three tones (clay lit top-left,
bark, soil shade), the bun (clay, bark), the eyes (ink 2 x 3 with a white catch-light top-left, rows 19 to 21, x 18 to 19 and 23 to 24) and the 2 px soil mouth on row 23 are painted by coordinates. The feet are two rows:
bark and soil on row 30 with the ink on row 31 (the lowest opaque row, as the adult). alert, huddle, eat f0 and f1 are drawn from the idle. Core 48 only, alpha 0 or 255, ink outline, never void.
usage: python3 -I species-s02-juv-clean.py OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from species_common import *
MASK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "species", "S02", "juv-direction", "idle-silhouette-32x32.txt")
M = [l.rstrip("\n") for l in open(MASK)]
def layer(ch):
    m = np.zeros((H, W), bool)
    for y, r in enumerate(M[:H]):
        for x, c in enumerate(r[:W]):
            if c in ch: m[y, x] = True
    return m
def outline_of(m):
    inner = m.copy()
    for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0)): inner &= np.roll(np.roll(m, dy, 0), dx, 1)
    return m & ~inner
FEET = [(11, 12), (14, 15), (18, 19), (21, 22)]
def parts():
    cap = layer("C"); sh = layer("r"); body = layer("BE"); bun = layer("T")
    return cap, sh, body, bun
def paint(cap, sh, body, bun, eyes=3, mouth=True):
    a = np.full((H, W), -1)
    U = cap | sh | body | bun; O = outline_of(U)
    for m, f in ((bun, lambda t, b: 'C' if t <= 1 else 'b'), (body, lambda t, b: 'C' if t <= 2 else ('s' if b <= 2 else 'b'))):
        for y in range(H):
            for x in range(W):
                if m[y, x]: put(a, x, y, f(tl(m, y, x), br(m, y, x)))
    for y in range(16, 26):                                          # the face is lit: clay round the eyes and the mouth (ink reads on it), bark and soil on the back, an oval edge
        for x in range(13, 25):
            if x >= 14 + abs(y - 21) // 2 and body[y, x] and br(body, y, x) > 2 and a[y, x] != IDX['soil']: put(a, x, y, 'C')
    for y in range(H):
        for x in range(W):
            if cap[y, x]:
                t, b = tl(cap, y, x), br(cap, y, x)
                put(a, x, y, 'P' if t <= 1 else ('C' if (b <= 1 or y >= 13) else 'D'))
            elif sh[y, x]: put(a, x, y, 's')
    for y in range(H):
        for x in range(W):
            if O[y, x]: put(a, x, y, 'I')
    return a
def feet_on(a, dx=0):
    for x0, x1 in FEET:
        x0 += dx; x1 += dx
        put(a, x0 - 1, 30, 'I'); put(a, x1 + 1, 30, 'I')
        for x in range(x0, x1 + 1): put(a, x, 30, 'b' if x == x0 else 's')
        for x in range(x0 - 1, x1 + 2): put(a, x, 31, 'I')
def face(a, dx=0, dy=0, rows=3, mouth=True):
    for ex in (18, 23):
        for r in range(rows):
            for c in (0, 1): put(a, ex + c + dx, 19 + r + dy, 'I')
        put(a, ex + dx, 19 + dy, 'W')
    if mouth: put(a, 21 + dx, 23 + dy + (rows - 3), 's'); put(a, 22 + dx, 23 + dy + (rows - 3), 's')
def idle():
    a = paint(*parts()); face(a); feet_on(a); return a
def moved(m, dx=0, dy=0): return np.roll(np.roll(m, dy, 0), dx, 1)
def alert():
    cap, sh, body, bun = parts()
    a = paint(moved(cap, -1), moved(sh, -1), body, bun)             # the cap tips back 1 px
    face(a, rows=4); feet_on(a); return a                           # the eyes widen to 2 x 4
def huddle():
    cap, sh, body, bun = parts()
    a = paint(moved(cap, 0, 8), moved(sh, 0, 8), moved(body, 0, 2), moved(bun, 0, 2))     # the cap pulled down over the eyes, the body 2 px lower
    for y in range(H):
        if y > 29: break
    for x in range(W):
        if a[30, x] >= 0 and a[30, x] != IDX['ink'] and a[31, x] < 0: put(a, x, 31, 'I')
    for ex in (18, 23): put(a, ex, 23, 'I'); put(a, ex + 1, 23, 'I')  # the eyes are a 1 px line under the brim
    return a
def eat(k):
    cap, sh, body, bun = parts()
    a = paint(moved(cap, 1), moved(sh, 1), moved(body, 1), bun)     # the body leans 1 px forward
    face(a, dx=1, mouth=(k == 1)); feet_on(a)
    if k == 0:
        for x in (22, 23): put(a, x, 23, 's'); put(a, x, 24, 's')      # the mouth open: two rows
        for x, y in ((27, 23), (28, 23), (27, 24), (28, 24)): put(a, x, y, 'p')   # a plumD bit 2 x 2 at the face
    else:
        for x, y in ((27, 24), (28, 24)): put(a, x, y, 'p')
    return a
MINI = ["............", "............", "............", "............", "...IIIIII...", "..IPPPDDDI..", ".ICCCCCCCCI.", "II.IsssssssI".replace("II.I", "II.I")[:12], "CCIbbWbbIbI.", "CCIbbIbbIbI.", ".IIbbbbbssI.", "..IIIIIIII.."]
def mini():
    a = np.full((12, 12), -1)
    for y, r in enumerate(MINI):
        for x, c in enumerate(r):
            if c != '.': put(a, x, y, c)
    return a
if __name__ == "__main__":
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    for name, a in (("idle", idle()), ("alert", alert()), ("huddle", huddle()), ("eat-f0", eat(0)), ("eat-f1", eat(1))):
        save(a, os.path.join(out, "c-token-S02-juv-%s-32x32.png" % name))
    save(mini(), os.path.join(out, "c-mini-S02-juv-12x12.png")); print("S02 juvenile round 2: the AD's silhouette, four poses, the mini")
