"""The C0 S01 juvenile Companion tokens (the AD's brief 10-15 04:20): the juvenile idle (24 px high, feet on row 31) and mini (9 px high) come from build-species-juv-token.py on the juvenile
stand (304 x 312, facing the page's way already, so no --flip) and are edited in place from the base's own pixels, never redrawn: the silhouette and the outline stay (the crest rooted on the
crown, the round head joined to the round body); what is edited, by coordinates: the stone rim, the charcoal back and head cap, the cream bib (snout to chest, paper, a bone highlight, sand under), the
four stubby legs with bone toes (the legs shorter than the adult's), the eyes (the near 3 x 3 with the adult's ring, orange iris, void pupil, white catch-light top-left, the far 2 x 3).
The four poses (alert, huddle, eat f0 and f1) are then drawn from the cleaned idle. The lowest opaque row is 31 in every token (11 in the mini).
Core 48 only, alpha 0 or 255, ink round the body, pine round the crest, never void (the pupils only). usage: python3 -I species-s01-juv-clean.py BASE_DIR OUT_DIR"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from species_common import *
LEAF = {nm(n) for n in ("pine", "forest", "leaf", "grass")}
WARM = {nm(n) for n in ("clay", "sand", "bone", "paper", "peach", "amber", "orange", "rust", "white")}
DARK = {nm(n) for n in ("slate", "stone", "night")}
LEGS = [(6, 7), (11, 12), (14, 15), (19, 20)]
def idle_from(base):
    a = base.copy(); ring = ring_of(a)
    inner = (a >= 0) & ~(ring & (a == nm('ink')))                      # the body's interior: everything but the ink outline
    for y in range(28, H): a[y, :] = -1; inner[y, :] = False           # the legs are rebuilt below
    # 1. the charcoal: the head cap (rows 11 to 16), the neck and the back down to the haunch (the cream belly line runs from the rump to the chest)
    dark = np.zeros_like(inner)
    for y in range(11, 28):
        for x in range(W):
            if not inner[y, x] or a[y, x] in LEAF: continue
            if (y <= 16 and x >= 12) or (x <= 11 and y <= 24) or (12 <= x <= 16 and y <= 19) or (17 <= x <= 18 and y <= 17) or (x <= 14 and y <= 21): dark[y, x] = True
    # 2. the warm pixels: the cream bib and haunch (paper, bone highlight on the top-left edge, sand on the bottom-right and in the back half)
    warm = inner & ~dark
    for y in range(H):
        for x in range(W):
            if not inner[y, x] or a[y, x] in LEAF: continue
            if dark[y, x]:
                t, b = tl(dark, y, x), br(dark, y, x)
                a[y, x] = nm('stone') if (t == 1 and 10 <= y <= 20 and x <= 22) else (nm('slate') if t == 2 and b > 1 else nm('night'))
            else:
                t, b = tl(warm, y, x), br(warm, y, x)
                a[y, x] = nm('sand') if (b == 1 or x < 12) else (nm('bone') if t == 1 and y >= 18 else nm('paper'))
    # 4. the muzzle (paper, a bone top row, one night mouth line), the eyes: the near 3 x 3 (x 19 to 21, y 14 to 16) and the far 2 x 3 (x 23 and 24): amber ring, orange iris, a void pupil toward the snout, a white catch-light top-left
    for y, (x0, x1) in {17: (20, 25), 18: (20, 25), 19: (19, 24), 20: (19, 23)}.items():
        for x in range(x0, x1 + 1):
            if inner[y, x]: put(a, x, y, 'B' if y == 17 else ('D' if y == 20 else 'P'))
    for x in range(21, 25): put(a, x, 19, 'N')
    for j, r in enumerate(["WAA", "AOV", "AAA"]):
        for i, c in enumerate(r): put(a, 19 + i, 14 + j, c)
    for j, r in enumerate(["WA", "OV", "AA"]):
        for i, c in enumerate(r): put(a, 23 + i, 14 + j, c)
    # 3. the legs: four stubby charcoal legs, three rows below the belly (29 dark, 30 bone toes, 31 ink), the belly's outline on row 28 between them
    for x in range(W):
        if a[27, x] >= 0 and not any(x0 - 1 <= x <= x1 + 1 for x0, x1 in LEGS): put(a, x, 28, 'I')
    for x0, x1 in LEGS:
        for y in (28, 29):
            put(a, x0 - 1, y, 'I'); put(a, x1 + 1, y, 'I')
            for x in range(x0, x1 + 1): put(a, x, y, 'S' if (y == 28 or x == x0) else 'N')
        put(a, x0 - 1, 30, 'I'); put(a, x1 + 1, 30, 'I')
        for x in range(x0, x1 + 1): put(a, x, 30, 'B')
        for x in range(x0 - 1, x1 + 2): put(a, x, 31, 'I')
    return a
# ------------------------------------------------------------------ the poses, drawn from the cleaned idle
def alert(I):
    a = np.full((H, W), -1)
    for y in range(8, 28): a[y - (2 if y <= 10 else 1)] = I[y]            # the head up 1 px, the crest tips one more (the crest a row taller: row 10 repeated)
    a[8] = I[10] if False else a[8]
    a[9] = I[10]
    a[27] = I[28]; a[28] = I[29]; a[29] = I[29]; a[30] = I[30]; a[31] = I[31]  # the legs a row longer, the feet on row 31
    return a
def huddle(I):
    body = insert_cols(I[10:28], 3, 0)                                    # (kept for symmetry with the adult: rows 10 to 27)
    a = np.full((H, W), -1)
    wide = insert_cols(I[10:28], 13, 2)[:, :W]                            # 2 px wider
    a[13:13 + wide.shape[0]] = wide                                       # 3 px lower: the belly's bottom on row 30, the outline under it on row 31
    for y in (11, 12):                                                     # the crest laid back: its lower rows only (the tips gone), shifted with the head
        row = insert_cols(I[y - 1 + 0:y], 13, 2)[:, :W][0]
        a[y + 2] = np.where(a[y + 2] >= 0, a[y + 2], row)
    for x in range(W):
        if a[30, x] >= 0: a[31, x] = IDX['ink']
    for x0 in (21, 25):                                                    # half closed: the top row of each eye in night
        for x in range(x0, x0 + (3 if x0 == 21 else 2)): put(a, x, 17, 'N')
    return a
def eat(I, k):
    a = np.full((H, W), -1); a[22:] = I[22:]
    for x in range(W):                                                     # the head and crest lowered 2 px: 0 behind x 8, 1 for x 9 to 11, 2 from x 12 on
        dy = 0 if x <= 8 else (1 if x <= 11 else 2)
        for y in range(0, 22):
            if I[y, x] >= 0 and y + dy < H: a[y + dy, x] = I[y, x]
    if k == 0:
        for x in range(22, 24): put(a, x, 22, 'N')                         # the mouth open
        for x, y in ((25, 22), (26, 22), (25, 23), (26, 23)): put(a, x, y, 'p')   # a plumD bit 2 x 2 at the snout
    else:
        for x, y in ((25, 23), (26, 23)): put(a, x, y, "p")                # the bit 2 x 1, the mouth closed
    return a
def mini_from(base):
    """the mini (12 x 12, 9 px high, the lowest row 11), from the base's silhouette: its interior repainted by coordinates"""
    a = base.copy()
    G9 = {5: {4: 'e', 5: 'g', 6: 'T', 7: 'T'}, 6: {5: 'S', 6: 'O', 7: 'V', 8: 'P'}, 7: {3: 'T', 4: 'T', 5: 'S', 6: 'P', 7: 'P', 8: 'B'}, 8: {2: 'S', 3: 'S', 4: 'N', 5: 'P', 6: 'P'},
          9: {2: 'N', 3: 'N', 4: 'P', 5: 'P', 6: 'P'}, 10: {2: 'B', 3: 'N', 4: 'B', 5: 'D', 6: 'P'}}
    for y, r in G9.items():
        for x, c in r.items(): put(a, x, y, c)
    for x in range(1, 8): put(a, x, 11, 'I')                          # the outline under the feet
    put(a, 8, 8, 'I'); put(a, 7, 8, 'I')
    return a
if __name__ == "__main__":
    base_dir, out = sys.argv[1:3]; os.makedirs(out, exist_ok=True)
    I = idle_from(load(os.path.join(base_dir, "c-token-S01-juv-idle-32x32.png")))
    for name, a in (("idle", I), ("alert", alert(I)), ("huddle", huddle(I)), ("eat-f0", eat(I, 0)), ("eat-f1", eat(I, 1))):
        save(a, os.path.join(out, "c-token-S01-juv-%s-32x32.png" % name))
    save(mini_from(load(os.path.join(base_dir, "c-mini-S01-juv-12x12.png"))), os.path.join(out, "c-mini-S01-juv-12x12.png"))
    print("S01 juvenile: the idle from the base's pixels, four poses from it, the mini")
