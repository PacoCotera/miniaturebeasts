"""The C0 S02 (Untuva) Companion tokens, cleaned IN PLACE from the base's pixels (build-species-token.py on the adult 144 x 152, --flip --ramps S02), as S01 round 3: the silhouette, the
outline and the cap are the base's; what is edited is, by coordinates: the body's three tones (soil shade, bark mid, clay lit, lit top-left), the cap as one clean shape of three tones (clay, sand,
paper, lit top-left) with a 1 px soil shadow row under its brim, the two ink 2 x 2 eyes each with a 1 px white catch-light, a small mouth, the short tail kept at the back, four stubby legs
(soil and bark) on row 30. The seven poses and the mini are drawn from the cleaned idle. Core 48 only, alpha 0 or 255, ink outline, never void.
usage: python3 -I species-s02-clean.py BASE_DIR OUT_DIR [IDLE.png]"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from species_common import *
LEGS = [(8, 10), (12, 14), (19, 21), (23, 25)]
def idle_from(base):
    a = base.copy(); ring = ring_of(a)
    inner = (a >= 0) & (a != IDX["ink"])                           # the outline is the ink cells; the edge pixels without one are body
    cap = inner.copy(); cap[10:] = False; body = inner.copy(); body[:10] = False
    for y in range(H):
        for x in range(W):
            if cap[y, x]:
                t, b = tl(cap, y, x), br(cap, y, x)
                put(a, x, y, 'P' if t <= 2 else ('C' if (b <= 1 or y >= 9) else 'D'))        # the cap: three tones, paper lit top-left, clay under the rim and on the shade side
            elif body[y, x]:
                t, b = tl(body, y, x), br(body, y, x)
                put(a, x, y, 'C' if t <= 3 else ('s' if b <= 3 else 'b'))                    # the bun: clay lit top-left, soil shade bottom-right, bark between
    for x in range(15, 28):
        if a[10, x] >= 0 and a[10, x] != IDX["ink"]: put(a, x, 10, "s")                            # the 1 px shadow row under the cap's brim
    # the legs: rows 28 to 31 rebuilt as four stubby legs (soil, a bark lit edge) with the outline between them
    a[28:32, :] = -1
    for x in range(2, 28):
        if a[27, x] >= 0 and not any(x0 - 1 <= x <= x1 + 1 for x0, x1 in LEGS): put(a, x, 28, 'I')
    for x0, x1 in LEGS:
        for y in (28, 29, 30):
            put(a, x0 - 1, y, 'I'); put(a, x1 + 1, y, 'I')
            for x in range(x0, x1 + 1): put(a, x, y, 'b' if x == x0 else 's')
        for x in range(x0 - 1, x1 + 2): put(a, x, 31, 'I')
    # the eyes: ink 2 x 2, each with a 1 px white catch-light on its top-left pixel; a small mouth of two soil pixels between them
    for ex in (22, 27):
        for dy in (0, 1):
            for dx in (0, 1): put(a, ex + dx, 12 + dy, 'I')
        put(a, ex, 12, 'W')
    put(a, 25, 15, 's'); put(a, 26, 15, 's')
    return a
# ------------------------------------------------------------------ the poses, from the cleaned idle: the cap is its own layer (rows 0 to 9) so it can move on the body; its brim's shadow row is drawn under it each time
def layers(I):
    cap = np.full_like(I, -1); cap[:10] = I[:10]
    body = I.copy(); body[:10] = -1; body[10] = np.where(I[10] == IDX['soil'], -2, I[10])   # row 10 is the brim's shadow: redrawn, so marked -2 and filled with bark below
    body[10][body[10] == -2] = IDX['bark']
    return cap, body
def compose(body, cap, cdx=0, cdy=0, shadow=True):
    a = body.copy(); cm = np.full_like(a, -1)
    for y in range(cap.shape[0]):
        for x in range(cap.shape[1]):
            if cap[y, x] >= 0 and 0 <= y + cdy < H and 0 <= x + cdx < W: cm[y + cdy, x + cdx] = cap[y, x]
    if shadow:                                                    # the 1 px soil shadow row under the brim: below each column's lowest cap pixel that is not the outline
        for x in range(W):
            ys = [y for y in range(H) if cm[y, x] >= 0 and cm[y, x] != IDX['ink']]
            if ys and ys[-1] + 1 < H and a[ys[-1] + 1, x] >= 0 and a[ys[-1] + 1, x] != IDX['ink']: a[ys[-1] + 1, x] = IDX['soil']
    a = np.where(cm >= 0, cm, a); return a
def eyes(a, rows, x0s=(22, 27), y0=12, catch=True):
    for ex in x0s:
        for dy in range(rows):
            for dx in (0, 1): put(a, ex + dx, y0 + dy, 'I')
        if catch and rows > 0: put(a, ex, y0, 'W')
def alert(I):
    cap, body = layers(I); a = np.full((H, W), -1)
    for y in range(10, 28): a[y - 1] = body[y]
    a[27] = body[28]; a[28] = body[28]; a[29] = body[29]; a[30] = body[30]; a[31] = body[31]     # the legs a row longer
    a = compose(a, cap, cdy=-1)
    eyes(a, 3, y0=11)                                             # eyes fully open: 2 x 3
    put(a, 25, 14, 's'); put(a, 26, 14, 's')
    return a
def flee(I):
    cap, body = layers(I)
    b = insert_cols(body[10:28], 15, 2)[:, :W]                    # the body 2 px longer
    a = np.full((H, W), -1); a[11:11 + b.shape[0]] = b            # 1 px lower
    sh = [(-1, -3), (-1, -3), (3, 5), (3, 5)]                     # the back legs 3 px further back, the front legs 3 px further forward (2 of them the stretch): stubby, splayed over two rows
    for (x0, x1), (u, d) in zip(LEGS, sh):
        put(a, x0 - 1 + u, 29, 'I'); put(a, x1 + 2 + u, 29, 'I')
        for x in range(x0 + u, x1 + 2 + u): put(a, x, 29, 'b' if x == x0 + u else 's')
        put(a, x0 - 1 + d, 30, 'I'); put(a, x1 + 2 + d, 30, 'I')
        for x in range(x0 + d, x1 + 2 + d): put(a, x, 30, 'b' if x == x0 + d else 's')
        for x in range(min(x0 - 1 + u, x0 - 1 + d), max(x1 + 3 + u, x1 + 3 + d)): put(a, x, 31, 'I')
    for x in range(W):
        if a[28, x] >= 0 and a[29, x] < 0: a[29, x] = IDX['ink']
    a = compose(a, cap, cdx=1, cdy=1)
    eyes(a, 2, x0s=(24, 29), y0=13)
    put(a, 27, 16, 's'); put(a, 28, 16, 's')
    return a
def huddle(I):
    cap, body = layers(I)
    b = insert_cols(body[10:28], 15, 2)[:, :W]                    # 2 px wider
    a = np.full((H, W), -1); a[12:12 + b.shape[0]] = b            # 2 px lower
    for x in range(W):                                            # the feet hidden: the outline closes under the bun on row 30
        if a[29, x] >= 0: a[30, x] = IDX['ink']
    a = compose(a, cap, cdx=1, cdy=4)                             # the cap pulled down over the eyes
    for ex in (24, 29):                                           # the eyes become a 1 px line under the brim
        put(a, ex, 15, 'I'); put(a, ex + 1, 15, 'I')
    return a
def shake(I, k):
    cap, body = layers(I); dx = -1 if k == 0 else 1
    a = shifted(body, dx, 0)
    a = compose(a, cap, cdx=-dx)                                  # the cap swings opposite the shift
    eyes(a, 2, x0s=(22 + dx, 27 + dx))
    put(a, 25 + dx, 15, 's'); put(a, 26 + dx, 15, 's')
    drops(a, k); return a
def eat(I, k):
    cap, body = layers(I); a = np.full((H, W), -1); a[19:] = body[19:]
    full = I.copy()
    for x in range(W):                                            # the head (cap and the face) lowered 2 px: 0 behind x 8, 1 for x 9 to 11, 2 from x 12 on
        dy = 0 if x <= 8 else (1 if x <= 11 else 2)
        for y in range(0, 19):
            if full[y, x] >= 0 and y + dy < H: a[y + dy, x] = full[y, x]
    a = shifted(a, -1, 0)                                         # one column back so the bit fits in front of the face
    if k == 0:
        put(a, 24, 17, 's'); put(a, 25, 17, 's')                  # the mouth open: two rows
        for x, y in ((30, 19), (31, 19), (30, 20), (31, 20)): put(a, x, y, 'p')   # a plumD bit 2 x 2 at the face
    else:
        for x, y in ((30, 20), (31, 20)): put(a, x, y, 'p')                       # the bit 2 x 1, the mouth closed
    return a
def mini_from(base):
    a = base.copy(); inner = (a >= 0) & (a != IDX['ink'])
    cap = inner.copy(); cap[5:] = False; body = inner.copy(); body[:6] = False      # the cap rows 2 to 4, the head's first row (5) is the brim's soil shadow, the head rows 6 to 11
    for y in range(12):
        for x in range(12):
            if cap[y, x]: put(a, x, y, 'P' if (tl(cap, y, x) <= 1 and y <= 3) else ('C' if (y == 4 or br(cap, y, x) <= 1) else 'D'))
            elif inner[y, x] and y == 5: put(a, x, y, 's')
            elif body[y, x]: put(a, x, y, 'C' if tl(body, y, x) <= 2 else ('s' if br(body, y, x) <= 2 else 'b'))
    put(a, 6, 7, 'I'); put(a, 9, 7, 'I')                           # the two eyes, 1 px ink
    return a
if __name__ == "__main__":
    base_dir, out = sys.argv[1:3]; os.makedirs(out, exist_ok=True)
    I = load(sys.argv[3]) if len(sys.argv) > 3 else idle_from(load(os.path.join(base_dir, "c-token-S02-idle-32x32.png")))
    for name, a in (("idle", I), ("alert", alert(I)), ("flee", flee(I)), ("huddle", huddle(I)), ("shake-f0", shake(I, 0)), ("shake-f1", shake(I, 1)), ("eat-f0", eat(I, 0)), ("eat-f1", eat(I, 1))):
        save(a, os.path.join(out, "c-token-S02-%s-32x32.png" % name))
    save(mini_from(load(os.path.join(base_dir, "c-mini-S02-12x12.png"))), os.path.join(out, "c-mini-S02-12x12.png")); print("S02: the idle from the base's pixels, seven poses from it, the mini")
