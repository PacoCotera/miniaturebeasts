"""The C0 S02 (Untuva) juvenile Companion tokens (the AD's brief 10-15 04:20): the idle (22 px high, feet on row 31) and the mini (8 px high) come from build-species-juv-token.py on the
juvenile stand (304 x 312, --flip --ramps S02) and are cleaned IN PLACE from the base's pixels, as the adult: the silhouette and outline are the base's; the bun's three tones (soil shade, bark mid,
clay lit top-left), the cap as one shape of three tones (clay, sand, paper) seated on the head with a 1 px soil shadow row under its brim and no ink between cap and head, the two big ink eyes (2 x 3, each with a
1 px white catch-light), a 2 px soil mouth, four stubby legs on rows 29 to 30 (shorter than the adult's), are edited by coordinates. alert, huddle, eat f0 and f1 are then drawn from the idle.
The lowest opaque row is 31 in every token (11 in the mini). Core 48 only, alpha 0 or 255, ink outline, never void. usage: python3 -I species-s02-juv-clean.py BASE_DIR OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from species_common import *
LEGS = [(9, 10), (14, 15), (18, 19), (23, 24)]
def idle_from(base):
    a = base.copy(); ring = ring_of(a)
    inner = (a >= 0) & ~(ring & (a == IDX["ink"]))                   # the body's interior: everything but the ink outline (the base's stray eye ink is body)
    inner[29:] = False
    cap = np.zeros_like(inner); cap[10:15] = inner[10:15]; cap[15, :11] = inner[15, :11]; cap[15, 23:] = inner[15, 23:]
    body = inner & ~cap
    for y in range(H):
        for x in range(W):
            if cap[y, x]:
                t, b = tl(cap, y, x), br(cap, y, x)
                put(a, x, y, 'P' if t <= 1 else ('C' if (b <= 1 or y >= 14) else 'D'))
            elif body[y, x]:
                t, b = tl(body, y, x), br(body, y, x)
                put(a, x, y, 'C' if t <= 3 else ('s' if b <= 3 else 'b'))
    # the soil shadow row on the head under the brim (the head's first row below each cap column)
    for x in range(W):
        ys = [y for y in range(H) if cap[y, x]]
        if ys and a[ys[-1] + 1, x] >= 0 and a[ys[-1] + 1, x] != IDX['ink'] and not cap[ys[-1] + 1, x]: put(a, x, ys[-1] + 1, 's')
    # the legs: rows 29 to 31 rebuilt as four stubby legs (soil, a bark lit edge), the outline between them on row 29
    a[29:32, :] = -1
    for x in range(W):
        if a[28, x] >= 0 and a[28, x] != IDX['ink'] and not any(x0 - 1 <= x <= x1 + 1 for x0, x1 in LEGS): put(a, x, 29, 'I')
    for x0, x1 in LEGS:
        for y in (29, 30):
            put(a, x0 - 1, y, 'I'); put(a, x1 + 1, y, 'I')
            for x in range(x0, x1 + 1): put(a, x, y, 'b' if x == x0 else 's')
        for x in range(x0 - 1, x1 + 2): put(a, x, 31, 'I')
    # the eyes: big, ink 2 x 3, the white catch-light on the top-left pixel; a 2 px soil mouth between them, 1 px under
    for ex in (19, 24):
        for dy in range(3):
            for dx in (0, 1): put(a, ex + dx, 19 + dy, 'I')
        put(a, ex, 19, 'W')
    put(a, 22, 22, 's'); put(a, 23, 22, 's')
    return a
def layers(I):
    cap = np.full_like(I, -1); cap[:15] = I[:15]; cap[15, :11] = I[15, :11]; cap[15, 23:] = I[15, 23:]
    body = I.copy(); body[:15] = -1
    for x in range(W):                                                # row 15 under the cap: the brim's tips (x <= 10 and x >= 23) are the cap's own; between them the head is bark under the soil shadow row
        if (cap[15, x] >= 0 and cap[15, x] != IDX['ink']) or body[15, x] == IDX['ink']: body[15, x] = -1
        elif body[15, x] == IDX['soil']: body[15, x] = IDX['bark']
    return cap, body
def compose(body, cap, cdx=0, cdy=0, shadow=True):
    a = body.copy(); cm = np.full_like(a, -1)
    for y in range(cap.shape[0]):
        for x in range(cap.shape[1]):
            if cap[y, x] >= 0 and 0 <= y + cdy < H and 0 <= x + cdx < W: cm[y + cdy, x + cdx] = cap[y, x]
    if shadow:
        for x in range(W):
            ys = [y for y in range(H) if cm[y, x] >= 0 and cm[y, x] != IDX['ink']]
            if ys and ys[-1] + 1 < H and a[ys[-1] + 1, x] >= 0 and a[ys[-1] + 1, x] != IDX['ink']: a[ys[-1] + 1, x] = IDX['soil']
    return np.where(cm >= 0, cm, a)
def eyes(a, rows, x0s=(19, 24), y0=19, catch=True):
    for ex in x0s:
        for dy in range(rows):
            for dx in (0, 1): put(a, ex + dx, y0 + dy, 'I')
        if catch and rows > 0: put(a, ex, y0, 'W')
def alert(I):
    cap, body = layers(I); a = np.full((H, W), -1)
    for y in range(14, 29): a[y - 1] = body[y]                       # the head and bun up 1 px
    a[28] = body[28]; a[29] = body[29]; a[30] = body[30]; a[31] = body[31]   # the legs a row longer (the belly's outline row now 28)
    a = compose(a, cap, cdy=-1)
    eyes(a, 3, y0=18); put(a, 22, 21, 's'); put(a, 23, 21, 's')
    return a
def huddle(I):
    cap, body = layers(I)
    b = insert_cols(body[17:29], 15, 2)[:, :W]                       # 2 px wider (the head's top rows left out: the pulled cap covers them)
    a = np.full((H, W), -1); a[19:19 + b.shape[0]] = b               # 2 px lower: the bun's bottom row 30
    for x in range(W):                                               # the feet hidden: the outline closes under the bun on row 31
        if a[30, x] >= 0: a[31, x] = IDX['ink']
    a = compose(a, cap, cdx=1, cdy=6)                                # the cap pulled down over the eyes (its top on the bun's top)
    for ex in (21, 26): put(a, ex, 22, 'I'); put(a, ex + 1, 22, 'I') # the eyes become a 1 px line under the brim
    return a
def eat(I, k):
    cap, body = layers(I); a = np.full((H, W), -1); a[24:] = body[24:]
    for x in range(W):                                               # the head lowered 2 px (the cap rigidly, below): 0 behind x 5, 1 for x 6 to 8, 2 from x 9 on
        dy = 0 if x <= 5 else (1 if x <= 8 else 2)
        for y in range(15, 24):
            if body[y, x] >= 0 and y + dy < H: a[y + dy, x] = body[y, x]
    a = compose(a, cap, cdy=2)
    a = shifted(a, -1, 0)
    if k == 0:
        put(a, 21, 24, 's'); put(a, 22, 24, 's')                     # the mouth open: two rows
        for x, y in ((28, 23), (29, 23), (28, 24), (29, 24)): put(a, x, y, 'p')
    else:
        for x, y in ((28, 24), (29, 24)): put(a, x, y, 'p')
    return a
def mini_from(base):
    """the mini (12 x 12, 8 px high, the lowest row 11), from the base's silhouette, its interior repainted by coordinates: the cap in three tones with its brim, the soil shadow row under the brim on the head,
    two 1 x 2 ink eyes (the near one with a white catch-light), the bun's clay lit top-left and soil shade bottom-right, the outline closed under the body on row 11"""
    a = base.copy(); ring = ring_of(a)
    for y in range(12):
        for x in range(12):
            if a[y, x] >= 0 and not (ring[y, x] and a[y, x] == IDX['ink']): a[y, x] = -1       # the interior is repainted from the rows below
    ROWS = {5: {3: 'P', 4: 'P', 5: 'P', 6: 'D', 7: 'D', 8: 'D'}, 6: {2: 'C', 3: 'C', 4: 'C', 5: 'C', 6: 'C', 7: 'C', 8: 'C', 9: 'C'}, 7: {2: 's', 3: 's', 4: 's', 5: 's', 6: 's', 7: 's', 8: 's'},
            8: {1: 'C', 2: 'C', 3: 'b', 4: 'W', 5: 'b', 6: 'b', 7: 'I', 8: 'b'}, 9: {1: 'C', 2: 'b', 3: 'b', 4: 'I', 5: 'b', 6: 'b', 7: 'I', 8: 'b'},
            10: {3: 'b', 4: 'b', 5: 's', 6: 's', 7: 's', 8: 's'}}
    for y, r in ROWS.items():
        for x, c in r.items(): put(a, x, y, c)
    for x in range(2, 9): put(a, x, 11, 'I')
    put(a, 2, 10, 'I')
    return a
if __name__ == "__main__":
    base_dir, out = sys.argv[1:3]; os.makedirs(out, exist_ok=True)
    I = idle_from(load(os.path.join(base_dir, "c-token-S02-juv-idle-32x32.png")))
    for name, a in (("idle", I), ("alert", alert(I)), ("huddle", huddle(I)), ("eat-f0", eat(I, 0)), ("eat-f1", eat(I, 1))):
        save(a, os.path.join(out, "c-token-S02-juv-%s-32x32.png" % name))
    save(mini_from(load(os.path.join(base_dir, "c-mini-S02-juv-12x12.png"))), os.path.join(out, "c-mini-S02-juv-12x12.png")); print("S02 juvenile: the idle from the base's pixels, four poses from it, the mini")
