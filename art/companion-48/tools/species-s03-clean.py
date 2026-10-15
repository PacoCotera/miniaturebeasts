"""The C0 S03 (Tuikis) Companion tokens, cleaned IN PLACE from the base's pixels (build-species-token.py on the adult 144 x 152, --flip --ramps S03), as S01 round 3: the silhouette (the round
head with its two round ears and the antenna, the neck and body, the four slender legs, the tail) and the outline are the base's; what is edited is, by coordinates: the coat in tealD, teal and aqua
(lit top-left, mint only as a 1 px rim on the top-left edges), the inner ears and the muzzle in mint, the two ink 2 x 2 eyes with a white catch-light, four slender legs 2 px wide (never 1) on row 30,
and the tail's bulb (3 x 3: cream lit, yellow, gold shade) on its stalk (1 px of gold with its ink). The seven poses, the curl and the settle, and the mini are drawn from the cleaned idle.
Core 48 only, alpha 0 or 255, ink outline, never void. usage: python3 -I species-s03-clean.py BASE_DIR OUT_DIR [IDLE.png]"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from species_common import *
LEGS = [(6, 7), (9, 10), (14, 15), (17, 18)]                     # slender: 2 px interior, one ink px between neighbours; back near, back far, front far, front near
def idle_from(base):
    a = base.copy(); ink = IDX['ink']
    inner = (a >= 0) & (a != ink)
    for y in range(9, 15):                                        # the base's tail bulb and its smear are cleared: redrawn below
        for x in range(2, 7):
            if y <= 13 or x <= 5: a[y, x] = -1
    inner = (a >= 0) & (a != ink)
    # the coat: aqua lit, teal mid, tealD in the shade (bottom-right and under); mint only as a 1 px rim on the top-left edges of the head and back
    body = inner.copy(); body[:, :5] = False
    for y in range(H):
        for x in range(W):
            if not body[y, x]: continue
            t, b = tl(body, y, x), br(body, y, x)
            put(a, x, y, 'm' if (t == 1 and (y <= 16 or x <= 8)) else ('d' if b <= 1 else ('t' if b <= 3 else 'q')))
    # the legs: rows 23 to 31 rebuilt as four slender legs, 2 px interior, ink either side; aqua lit, teal on the far legs
    a[23:32, :] = -1
    for x in range(5, 22):
        if a[22, x] >= 0 and not any(x0 - 1 <= x <= x1 + 1 for x0, x1 in LEGS): put(a, x, 23, 'I')
    for k, (x0, x1) in enumerate(LEGS):
        for y in range(23, 31):
            put(a, x0 - 1, y, 'I'); put(a, x1 + 1, y, 'I')
            put(a, x0, y, 'q' if k in (0, 3) else 't'); put(a, x1, y, 't' if k in (0, 3) else 'd')
        for x in range(x0 - 1, x1 + 2): put(a, x, 31, 'I')
    # the inner ears and the muzzle in mint
    for x, y in ((14, 7), (15, 7), (14, 8), (15, 8), (24, 7), (25, 7), (24, 8), (25, 8), (24, 13), (25, 13), (25, 12), (24, 12)): put(a, x, y, 'm') if (a[y, x] >= 0 and a[y, x] != ink) else None
    # the eyes: ink 2 x 2 with a white catch-light top-left
    for ex in (18, 22):
        for dy in (0, 1):
            for dx in (0, 1): put(a, ex + dx, 10 + dy, 'I')
        put(a, ex, 10, 'W')
    # the tail: the bulb 3 x 3 (cream, yellow, gold shade) on its stalk of 1 px gold with its ink, joined to the back
    for dy, r in enumerate(["cYY", "YYG", "YGG"]):
        for dx, c in enumerate(r):
            put(a, 3 + dx, 10 + dy, {'c': 'cream', 'Y': 'yellow', 'G': 'gold'}[c])
    for x in range(2, 7): put(a, x, 9, 'I')
    for y in (10, 11, 12): put(a, 2, y, 'I'); put(a, 6, y, 'I')
    for x in range(2, 7): put(a, x, 13, 'I') if x != 4 else None
    put(a, 4, 13, 'G'); put(a, 4, 14, 'G'); put(a, 3, 13, 'I'); put(a, 3, 14, 'I'); put(a, 5, 13, 'I'); put(a, 5, 14, 'I')
    return a
# ------------------------------------------------------------------ the poses, from the cleaned idle (rows 2 to 22 are the head, tail and body; rows 23 to 31 the legs, redrawn each time)
def torso(I): t = I.copy(); t[23:] = -1; return t
def leg_cols(a, spans, shifts, y0, y1):
    """the four slender legs on rows y0..y1: each a 2 px column slanted by its shift (0 at the top, the whole shift on the last row), one ink px between neighbours, the feet's ink on y1 + 1"""
    for k, ((x0, x1), d) in enumerate(zip(spans, shifts)):
        for y in range(y0, y1 + 1):
            sh = int(round(d * (y - y0) / max(1, y1 - y0)))
            put(a, x0 - 1 + sh, y, 'I'); put(a, x1 + 1 + sh, y, 'I')
            put(a, x0 + sh, y, 'q' if k in (0, 3) else 't'); put(a, x1 + sh, y, 't' if k in (0, 3) else 'd')
        sh = int(round(d))
        for x in range(x0 - 1 + sh, x1 + 2 + sh): put(a, x, y1 + 1, 'I')
def belly_outline(a, y):
    """the body's bottom outline on row y between the legs (and the legs' tops): ink under every body pixel with nothing below it"""
    for x in range(W):
        if a[y - 1, x] >= 0 and a[y, x] < 0: a[y, x] = IDX['ink']
def eyes(a, rows, x0s=(18, 22), y0=10, catch=True):
    for ex in x0s:
        for dy in range(rows):
            for dx in (0, 1): put(a, ex + dx, y0 + dy, 'I')
        if catch and rows > 0: put(a, ex, y0, 'W')
def alert(I):
    a = shifted(torso(I), 0, -1)                                  # the body, head and tail up 1 px
    leg_cols(a, LEGS, (0, 0, 0, 0), 22, 30)                       # the legs a row longer
    eyes(a, 3, y0=9)                                              # eyes fully open: 2 x 3
    return a
def flee(I):
    a = np.full((H, W), -1); body = insert_cols(torso(I)[2:23], 12, 2)[:, :W]      # the body 2 px longer
    a[3:3 + body.shape[0]] = body                                 # 1 px lower
    spans = [(x0 + (0 if x0 < 12 else 2), x1 + (0 if x0 < 12 else 2)) for x0, x1 in LEGS]
    leg_cols(a, spans, (-3, -3, 3, 3), 24, 30)                    # the legs stretched, not splayed: long slants, the back ones back, the front ones forward
    belly_outline(a, 24)
    return a
def huddle(I):
    a = np.full((H, W), -1); body = insert_cols(torso(I)[2:23], 12, 2)[:, :W]      # 2 px wider
    a[4:4 + body.shape[0]] = body                                 # 2 px lower (the head and tail with it)
    belly_outline(a, 26)
    eyes(a, 2, x0s=(20, 24), y0=12); 
    for x in (20, 21, 24, 25): put(a, x, 12, 'd')                 # half closed: the lid over the top row, the eye a 1 px line
    return a
def shake(I, k):
    dx = -1 if k == 0 else 1; a = shifted(I, dx, 0)
    for y in range(2, 9):                                         # the antenna and the ears' tops tilted opposite the shift: those rows moved 2 px back the other way
        row = a[y].copy(); a[y] = -1
        for x in range(W):
            if row[x] >= 0 and 0 <= x - 2 * dx < W and x >= 8: a[y, x - 2 * dx] = row[x]
            elif row[x] >= 0: a[y, x] = row[x]
    drops(a, k); return a
def eat(I, k):
    a = torso(I).copy(); a[:14, 11:] = -1
    for y in range(0, 14):                                        # the head (from x 11 on) lowered 2 px
        for x in range(11, W):
            if I[y, x] >= 0 and y + 2 < H: a[y + 2, x] = I[y, x]
    leg_cols(a, LEGS, (0, 0, 0, 0), 23, 30)
    if k == 0:
        put(a, 24, 15, 'I'); put(a, 25, 15, 'I')                  # the mouth open
        for x, y in ((27, 16), (28, 16), (27, 17), (28, 17)): put(a, x, y, 'p')       # a plumD bit 2 x 2 at the muzzle
    else:
        for x, y in ((27, 17), (28, 17)): put(a, x, y, 'p')                           # the bit 2 x 1, the mouth closed
    return a
def settle(I):
    a = shifted(torso(I), 0, 7)                                   # lowered: the body, head and tail down 7 px, the legs folded under (none)
    belly_outline(a, 30)
    for x, y in ((21, 29), (22, 29)): put(a, x, y, 'q')           # a front paw showing at the chest
    return a
def spans_mask(sp):
    M = np.zeros((H, W), bool)
    for y, (x0, x1) in sp.items(): M[y, x0:x1 + 1] = True
    return M
def coat(a, M, rim_rows=99):
    for y in range(H):
        for x in range(W):
            if M[y, x]:
                t, b = tl(M, y, x), br(M, y, x)
                put(a, x, y, 'm' if (t == 1 and y <= rim_rows) else ('d' if b <= 1 else ('t' if b <= 3 else 'q')))
def outline(a, M):
    for y in range(H):
        for x in range(W):
            if not M[y, x] and any(0 <= y + dy < H and 0 <= x + dx < W and M[y + dy, x + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1)): a[y, x] = IDX['ink']
def curl(I):
    a = np.full((H, W), -1)
    ball = spans_mask({15: (9, 15), 16: (7, 17), 17: (6, 18), 18: (5, 19), 19: (4, 20), 20: (4, 20), 21: (4, 20), 22: (4, 20), 23: (4, 20), 24: (4, 20), 25: (4, 20), 26: (5, 19), 27: (6, 18), 28: (7, 17), 29: (9, 15)})
    head = spans_mask({19: (19, 22), 20: (18, 23), 21: (17, 24), 22: (17, 24), 23: (17, 24), 24: (17, 24), 25: (17, 24), 26: (18, 23), 27: (19, 22)})
    ear = spans_mask({16: (21, 23), 17: (20, 24), 18: (20, 24)})
    tail = spans_mask({28: (7, 17), 27: (15, 18), 26: (17, 19), 25: (18, 20), 24: (19, 20), 23: (19, 20), 22: (19, 20), 21: (19, 20), 20: (18, 19), 19: (17, 18), 18: (15, 17), 17: (13, 15), 16: (12, 14)})   # the tail wrapped round the front, from the rump over the bottom and up the chest to the top
    allm = ball | head | ear | tail
    coat(a, ball, rim_rows=19)
    for y in range(H):
        for x in range(W):
            if tail[y, x] and not (head[y, x]): put(a, x, y, 'm' if (x + y) % 4 == 0 else 'd')       # the tail: a band of tealD with a lit mint pixel along it
    coat(a, head | ear, rim_rows=0)
    outline(a, allm)
    for x, y in ((21, 17), (22, 17), (21, 18), (22, 18)): put(a, x, y, 'm')                          # the inner ear
    for x in (19, 20, 21): put(a, x, 23, 'I')                                                       # the closed eye: a 1 px line
    for x, y in ((23, 25), (24, 25), (23, 26)): put(a, x, y, 'm')                                   # the muzzle
    for dy, r in enumerate(["cYY", "YYG", "YGG"]):                                                  # the bulb resting on top of the ball: yellow, no glow
        for dx, c in enumerate(r): put(a, 11 + dx, 12 + dy, {'c': 'cream', 'Y': 'yellow', 'G': 'gold'}[c])
    for x in range(10, 15): put(a, x, 11, 'I')
    for y in (12, 13, 14): put(a, 10, y, 'I'); put(a, 14, y, 'I')
    return a
def mini_from(base):
    a = np.full((12, 12), -1)
    head = {5: (4, 8), 6: (3, 9), 7: (3, 9), 8: (3, 9), 9: (4, 8), 10: (5, 7)}
    ears = {2: (2, 4), 3: (1, 5), 4: (1, 5), 5: (2, 3)}
    ears2 = {2: (8, 10), 3: (7, 11), 4: (7, 11), 5: (9, 10)}
    M = np.zeros((12, 12), bool)
    for sp in (head, ears, ears2):
        for y, (x0, x1) in sp.items(): M[y, x0:x1 + 1] = True
    for y in range(12):
        for x in range(12):
            if M[y, x]:
                t, b = tl(M, y, x), br(M, y, x)
                put(a, x, y, 'm' if (t == 1 and y <= 6) else ('d' if b <= 1 else ('t' if b <= 2 else 'q')))
    for y in range(12):
        for x in range(12):
            if not M[y, x] and any(0 <= y + dy < 12 and 0 <= x + dx < 12 and M[y + dy, x + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1)) and a[y, x] < 0: a[y, x] = IDX['ink']
    for x, y in ((2, 3), (3, 3), (2, 4), (3, 4), (8, 3), (9, 3), (8, 4), (9, 4)): put(a, x, y, 'm')   # the inner ears, mint
    put(a, 5, 7, 'I'); put(a, 8, 7, 'I')                           # the eyes, 1 px ink
    put(a, 7, 9, 'm'); put(a, 8, 9, 'm')                           # the muzzle, mint
    for x, y in ((6, 2), (6, 3), (6, 4)): put(a, x, y, 'G')         # the stalk, 1 px gold
    for x, y, c in ((5, 0, 'cream'), (6, 0, 'yellow'), (5, 1, 'yellow'), (6, 1, 'gold')): put(a, x, y, c)   # the bulb, 2 x 2
    return a
if __name__ == "__main__":
    base_dir, out = sys.argv[1:3]; os.makedirs(out, exist_ok=True)
    I = idle_from(load(os.path.join(base_dir, "c-token-S03-idle-32x32.png")))
    for name, a in (("idle", I), ("alert", alert(I)), ("flee", flee(I)), ("huddle", huddle(I)), ("shake-f0", shake(I, 0)), ("shake-f1", shake(I, 1)), ("eat-f0", eat(I, 0)), ("eat-f1", eat(I, 1)), ("settle", settle(I)), ("curl", curl(I))):
        save(a, os.path.join(out, "c-token-S03-%s-32x32.png" % name))
    save(mini_from(load(os.path.join(base_dir, "c-mini-S03-12x12.png"))), os.path.join(out, "c-mini-S03-12x12.png")); print("S03: the idle from the base's pixels, nine poses from it, the mini")
