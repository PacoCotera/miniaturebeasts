"""The C0 S01 juvenile Companion tokens, COLOUR-SPLIT pass (the AD, 10-15 05:25, so they match the Station juvenile; made from species-s01-juv-clean.py, which is kept as the signed round 3). Silhouette, eyes and snout knob unchanged;
the head is charcoal only on the crown (rows 12 to 15); from row 16 the cheeks, chin and throat are cream (paper lit top-left, bone, sand shade); the body has a charcoal saddle 3 to 4 px deep from its top edge at each column,
nape to rump, everything below cream (sides, belly, haunch, legs); the toe pads are sand on row 30, ink on row 31. The signed snout knob pixels (rows 16 to 18, x 23 to 26) are stamped from the signed idle.
usage: python3 -I species-s01-juv-split.py SIGNED_IDLE.png OUT_DIR
(earlier docstring) The C0 S01 juvenile Companion tokens, round 2 (the AD's direction art/companion-48/species/S01/juv-direction/ @ 3f0a3a81): the silhouette is the AD's target mask (idle-silhouette-32x32.txt:
a big round head, cols 9 to 27 and rows 12 to 21, with a 2 px snout bump, sitting forward over a round body hump, cols 2 to 23 and rows 18 to 28, no neck; the crest, two leaves, rooted on the crown;
four stubby legs). The head and the body are two layers (each with its own ink outline, the head's drawn over the body's), so the poses move the head on the body. Tones (the Pip regrade, a charcoal body):
night with a slate and a stone rim top-left; the cream bib from the snout through the throat and chest, then the belly underside only (paper, a bone highlight, sand under); the near eye 3 x 3 at (21,15), the far
2 x 3 at (15 to 16, 14 to 16): amber ring, orange iris, void pupil, white catch-light top-left; the muzzle's night mouth line; the legs charcoal with bone toes on row 30 and the outline under them on row 31.
alert, huddle, eat f0 and f1 are drawn from the idle. Core 48 only, alpha 0 or 255, ink round the body, pine round the crest, never void (the pupils only). usage: python3 -I species-s01-juv-clean.py OUT_DIR"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from species_common import *
HEAD = {12: (13, 22), 13: (11, 23), 14: (10, 24), 15: (10, 24), 16: (9, 26), 17: (9, 27), 18: (9, 26), 19: (9, 25), 20: (10, 24), 21: (11, 23)}   # the head: round, cols 9 to 27; the snout bump rows 16 to 17
BODY = {18: (7, 12), 19: (5, 23), 20: (4, 23), 21: (3, 23), 22: (3, 23), 23: (2, 23), 24: (2, 22), 25: (2, 22), 26: (2, 21), 27: (3, 21), 28: (3, 20)}
CREST = {8: ((14, 15), (21, 22)), 9: ((13, 16), (20, 23)), 10: ((13, 17), (19, 22)), 11: ((15, 21),)}
LEGS = [(4, 5), (8, 9), (14, 15), (18, 19)]
def mask_of(spans):
    m = np.zeros((H, W), bool)
    for y, s in spans.items():
        for x0, x1 in (s if isinstance(s[0], tuple) else (s,)): m[y, x0:x1 + 1] = True
    return m
def outline_of(m):
    inner = m.copy()
    for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0)): inner &= np.roll(np.roll(m, dy, 0), dx, 1)
    return m & ~inner
def tone(m, a, cream_fn, put_cream):
    """paint the mask m (its whole area, outline cells included: the union's ink outline goes over them later) with the charcoal rim and the cream"""
    for y in range(H):
        for x in range(W):
            if not m[y, x]: continue
            t, b = tl(m, y, x), br(m, y, x)
            if cream_fn(x, y): put(a, x, y, 'D' if (b <= 1 or put_cream(x, y)) else ('B' if t == 1 else 'P'))
            else: put(a, x, y, 'T' if t == 1 else ('S' if t == 2 else 'N'))
SNOUT = {}                                                         # the signed idle's knob pixels (x 23 to 26, y 16 to 18), stamped from the signed file in __main__
def head_layer():
    m = mask_of(HEAD); a = np.full((H, W), -1)
    tone(m, a, lambda x, y: y >= 16, lambda x, y: False)             # charcoal on the crown only (rows 12 to 15); cheeks, chin and throat cream
    for j, r in enumerate(["WAA", "AOV", "AAA"]):
        for i, ch in enumerate(r): put(a, 20 + i, 14 + j, ch)       # the near eye (21,15)
    for j, r in enumerate(["WA", "OV", "AA"]):
        for i, ch in enumerate(r): put(a, 15 + i, 14 + j, ch)       # the far eye (15 to 16, 14 to 16)
    for (x, y), c in SNOUT.items(): a[y, x] = c
    for x in (22, 23): put(a, x, 18, 'N')                            # the mouth line, kept
    return a, m
def body_layer():
    m = mask_of(BODY); a = np.full((H, W), -1)
    top = {x: min(y for y in range(H) if m[y, x]) for x in range(W) if m[:, x].any()}
    depth = lambda x: 3 if (x <= 4 or x >= 15) else 4
    tone(m, a, lambda x, y: x >= 10 or y > top[x] + depth(x) - 1, lambda x, y: False)    # a charcoal saddle along the back, nape to rump (from x 10 on the head covers the back, the throat stays cream); everything below is cream
    return a, m
def legs_on(a, top=29):
    for x0, x1 in LEGS:
        for y in range(top, 31):
            put(a, x0 - 1, y, 'I'); put(a, x1 + 1, y, 'I')
            for x in range(x0, x1 + 1): put(a, x, y, 'D' if y == 30 else ('B' if x == x0 else 'P'))
        for x in range(x0 - 1, x1 + 2): put(a, x, 31, 'I')
def shift_mask(m, dx, dy):
    return np.roll(np.roll(m, dy, 0), dx, 1)
def compose(dx=0, dy=0, bdy=0, legs=True):
    hc, hm = head_layer(); bc, bm = body_layer(); cm = mask_of(CREST)
    hc = shifted(hc, dx, dy); hm = shift_mask(hm, dx, dy); cm = shift_mask(cm, dx, dy); bc = shifted(bc, 0, bdy); bm = shift_mask(bm, 0, bdy)
    a = np.where(bm, bc, -1); a = np.where(hm, hc, a)                # the head over the body, no ink line between them
    U = bm | hm
    for y in range(H):                                               # the crest: pine outline, leaf and grass fill, lit top-left (it is drawn above the head and rooted on it)
        for x in range(W):
            if cm[y, x] and not hm[y, x]:
                put(a, x, y, 'e' if outline_of(cm | hm)[y, x] else ('g' if (x + y) % 4 == 0 else ('f' if x >= 19 and y >= 10 else 'l')))
    for y in range(H):                                               # one ink outline round the body and head (not under the crest, where the leaves meet the crown)
        for x in range(W):
            if U[y, x] and outline_of(U)[y, x]: put(a, x, y, 'I')
    if legs: legs_on(a)
    return a
def idle(): return compose()
def alert(): return compose(dy=-2)                                      # the head up 2 px (the crest with it)
def huddle(): return compose(dy=3, bdy=3, legs=False)                   # head and body lowered 3 px: the belly's outline on row 31, the legs hidden
def eat(k):
    a = compose(dy=2, dx=1)                                             # the head down 2 px and 1 forward
    if k == 0:
        for x in range(25, 28): put(a, x, 20, 'N')                      # the mouth open
        for x, y in ((28, 20), (29, 20), (28, 21), (29, 21)): put(a, x, y, 'p')   # a plumD bit 2 x 2 at the snout
    else:
        for x, y in ((28, 21), (29, 21)): put(a, x, y, 'p')             # the bit 2 x 1, the mouth closed
    return a
MINI = ["............", "............", "............", ".....e.e....", "....elgle...", "...ITTSSSI..", "..ITSSSOVSI.", ".ITSBPPPPPPI", ".ISSPPPPPDI.", ".ISNPPPPPPI.", ".IDPPPPDPDI.", "..IIIIIIII.."]   # a charcoal crown and back line, cream below, the snout a knob
def mini():
    a = np.full((12, 12), -1)
    for y, r in enumerate(MINI):
        for x, c in enumerate(r):
            if c != '.': put(a, x, y, c)
    return a
if __name__ == "__main__":
    signed, out = sys.argv[1:3]; os.makedirs(out, exist_ok=True)
    sg = load(signed)
    for y in range(16, 19):
        for x in range(23, 27): SNOUT[(x, y)] = sg[y, x]
    for name, a in (("idle", idle()), ("alert", alert()), ("huddle", huddle()), ("eat-f0", eat(0)), ("eat-f1", eat(1))):
        save(a, os.path.join(out, "c-token-S01-juv-%s-32x32.png" % name))
    save(mini(), os.path.join(out, "c-mini-S01-juv-12x12.png")); print("S01 juvenile colour split: crown charcoal, saddle charcoal, cream below")
