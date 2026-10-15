"""The C0 S03 (Tuikis) juvenile Companion tokens (the AD's brief 10-15 04:20): the idle (24 px high, feet on row 31) and the mini (10 px high) come from build-species-juv-token.py on the juvenile
stand (304 x 312, --flip --ramps S03; the stand's grey ground shadow removed first) and are cleaned IN PLACE from the base's pixels: the silhouette and the outline are the base's (the big round head with its
round ears, the body, the tail rising to its bulb); what is edited, by coordinates: the coat in tealD, teal and aqua (lit top-left, mint a 1 px rim only), the two big ink eyes (2 x 3, a white catch-light top-left),
the inner ears and the muzzle in mint, a 1 px antenna on the head, four short slender legs on rows 26 to 30, and the tail's bulb (gold) on its teal stalk. alert, huddle, eat f0 and f1 are drawn from the idle.
The lowest opaque row is 31 in every token (11 in the mini). Core 48 only, alpha 0 or 255, ink outline, never void. usage: python3 -I species-s03-juv-clean.py BASE_DIR OUT_DIR
Note (10-15 04:40): the signed S03 juvenile files carry the AD's hand fix (the antenna a teal stalk with an ink cap above) and hand edits in alert, huddle and the mini; this script reproduces the idle and
the eat frames byte for byte, not those three. Do NOT re-run it over the signed files."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from species_common import *
LEGS = [(8, 9), (11, 12), (16, 17), (21, 22)]                     # slender: 2 px interior; back near, back far, front far, front near
def idle_from(base):
    a = base.copy(); ring = ring_of(a); ink = IDX['ink']
    a[26:, :] = -1                                                # the legs are rebuilt
    a[:, :5] = np.where(np.arange(H)[:, None] < 99, a[:, :5], a[:, :5])
    inner = (a >= 0) & ~(ring & (a == ink))                       # the interior: the base's stray ink and white pixels (its eyes, misplaced) are body
    tail = np.zeros_like(inner); tail[:17, :9] = inner[:17, :9]; tail[17:, :] = False
    body = inner & ~tail
    for y in range(H):
        for x in range(W):
            if not body[y, x]: continue
            t, b = tl(body, y, x), br(body, y, x)
            put(a, x, y, 'm' if (runs(body, y, x, -1, 0) == 1 and runs(body, y, x, 0, -1) <= 2) else ('d' if b <= 1 else ('t' if b <= 3 else 'q')))
    for y in range(H):
        for x in range(W):
            if tail[y, x]: put(a, x, y, 't')                      # the stalk: teal
    # the tail's bulb: 2 x 2 (cream, yellow, yellow, gold) at the stalk's tip, the stalk below it
    for dy, r in enumerate(["cY", "YG"]):
        for dx, c in enumerate(r): put(a, 2 + dx, 9 + dy, {'c': 'cream', 'Y': 'yellow', 'G': 'gold'}[c])
    put(a, 3, 11, 't')
    # the legs: rows 26 to 31 rebuilt as four short slender legs, 2 px interior, ink either side; aqua lit on the near legs, teal on the far
    for x in range(W):
        if a[25, x] >= 0 and a[25, x] != ink and not any(x0 - 1 <= x <= x1 + 1 for x0, x1 in LEGS): put(a, x, 26, 'I')
    for k, (x0, x1) in enumerate(LEGS):
        for y in range(26, 31):
            put(a, x0 - 1, y, 'I'); put(a, x1 + 1, y, 'I')
            put(a, x0, y, 'q' if k in (0, 3) else 't'); put(a, x1, y, 't' if k in (0, 3) else 'd')
        for x in range(x0 - 1, x1 + 2): put(a, x, 31, 'I')
    # the inner ears (mint, 2 px) on the two round ears, the muzzle (mint 2 px), the antenna (1 px gold on the crown)
    for x, y in ((16, 10), (17, 10), (26, 9), (27, 9), (27, 10), (26, 10)):
        if a[y, x] >= 0 and a[y, x] != ink: put(a, x, y, 'm')
    # the eyes: big, ink 2 x 3 with a white catch-light top-left
    for ex in (19, 24):
        for dy in range(3):
            for dx in range(2): put(a, ex + dx, 12 + dy, 'I')
        put(a, ex, 12, 'W')
    put(a, 26, 17, 'm'); put(a, 27, 17, 'm')
    for x, y in ((16, 8), (17, 8), (15, 9), (18, 9)): put(a, x, y, 'I')   # the near ear: a 2 px nub with its ink, joined to the crown (the head's outline opens under it)
    for x in (16, 17): put(a, x, 9, 't')
    put(a, 21, 7, 'I'); put(a, 21, 8, 't'); put(a, 21, 9, 't')           # the antenna (the AD's fix): a teal stalk through the crown's outline with an ink cap above it
    return a
# ------------------------------------------------------------------ the poses, drawn from the cleaned idle
def torso(I): t = I.copy(); t[26:] = -1; return t
def legs_on(a, rows=range(26, 31), top=26):
    for x in range(W):
        if a[top - 1, x] >= 0 and a[top - 1, x] != IDX['ink'] and not any(x0 - 1 <= x <= x1 + 1 for x0, x1 in LEGS): put(a, x, top, 'I')
    for k, (x0, x1) in enumerate(LEGS):
        for y in range(top, 31):
            put(a, x0 - 1, y, 'I'); put(a, x1 + 1, y, 'I')
            put(a, x0, y, 'q' if k in (0, 3) else 't'); put(a, x1, y, 't' if k in (0, 3) else 'd')
        for x in range(x0 - 1, x1 + 2): put(a, x, 31, 'I')
def alert(I):
    a = np.full((H, W), -1)
    for y in range(8, 26): a[y - 1] = torso(I)[y]                       # the head and body up 1 px, the legs a row longer
    a[7] = np.where(np.arange(W) == 21, I[8], np.where(np.arange(W) == 21, -1, a[7]))   # the antenna's gold tip up one more
    a[8, 21] = I[8, 21]; a[7, 21] = I[8, 21]; put(a, 21, 8, 't')
    for k, y in ((1, 8),): pass
    legs_on(a, top=25)
    return a
def huddle(I):
    t = torso(I); a = np.full((H, W), -1)
    wide = insert_cols(t[8:26], 13, 2)[:, :W]                           # 2 px wider
    a[13:13 + wide.shape[0]] = wide                                     # 5 px lower: the body's bottom row 30, the outline under it on row 31
    for x in range(W):
        if a[30, x] >= 0: a[31, x] = IDX['ink']
    for x0 in (21, 26):                                                 # half closed: the top row of each eye in night
        for x in range(x0, x0 + 2): put(a, x, 17, 'N')
    return a
def eat(I, k):
    a = np.full((H, W), -1); a[21:] = I[21:]
    for x in range(W):                                                   # the head lowered 2 px: 0 behind x 11, 1 for x 12 and 13, 2 from x 14 on
        dy = 0 if x <= 11 else (1 if x <= 13 else 2)
        for y in range(0, 21):
            if I[y, x] >= 0 and y + dy < H: a[y + dy, x] = I[y, x]
    if k == 0:
        for x, y in ((30, 20), (31, 20), (30, 21), (31, 21)): put(a, x, y, 'p')   # a plumD bit 2 x 2 at the snout
    else:
        for x, y in ((30, 21), (31, 21)): put(a, x, y, 'p')
    return a
def mini_from(base):
    """the mini (12 x 12, 10 px high, the lowest row 11), by coordinates over the base's tail and head: two small round ears set apart (2 x 2 each), one ink eye with a white pixel and a second beside it,
    a 2 px mint muzzle, a 1 px antenna, the tail's gold bulb"""
    a = np.full((12, 12), -1)
    ROWS = ["....II..II..", "...IttIIttI.", "...IqqqqqtI.", "...IqWqqIqtI", "..IqqIqqIqmI", "G.IqqqqqqmmI", "tIqqqqqqddI.", ".IqqqqqddI..", ".IqIqIqqdI..", "..IIIIIIII.."]
    for dy, r in enumerate(ROWS):
        for x, c in enumerate(r):
            if c != '.': put(a, x, 2 + dy, c)
    put(a, 7, 2, 'G'); put(a, 5, 6, 'I')
    return a
if __name__ == "__main__":
    base_dir, out = sys.argv[1:3]; os.makedirs(out, exist_ok=True)
    I = idle_from(load(os.path.join(base_dir, "c-token-S03-juv-idle-32x32.png")))
    for name, a in (("idle", I), ("alert", alert(I)), ("huddle", huddle(I)), ("eat-f0", eat(I, 0)), ("eat-f1", eat(I, 1))):
        save(a, os.path.join(out, "c-token-S03-juv-%s-32x32.png" % name))
    save(mini_from(load(os.path.join(base_dir, "c-mini-S03-juv-12x12.png"))), os.path.join(out, "c-mini-S03-juv-12x12.png")); print("S03 juvenile: the idle from the base's pixels, four poses from it, the mini")
