"""P1: chapter-plate-{read,unread,sealed}-40x40 at (608 + 48 i, 200), the plate under each 24x24 rail emblem (the emblem is drawn
by the page, bone-white, centred). read: a raised sage plate, bevelled, lit from the top left. unread: the same housing as a
recessed socket, its floor the dark ground, an inner shade on the top and left walls and a lit lip on the bottom and right.
sealed: the read plate with a bark band across its lower margin and a sand clasp, kept below the emblem's box (y >= 33).
Matte, quieter than the emblem; a soft contact shadow baked. usage: make-chapter-plates.py OUT_DIR"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paintkit import *

def plate(state):
    c = Canvas(40, 40)
    if state == 'unread':
        c.box(1, 1, 37, 37, 2.5, SAGE)
        c.box(5, 5, 29, 29, 3, GROUND, depth=-1.0)                 # the socket: a bevel falling inward
    else:
        c.box(1, 1, 37, 37, 3.5, SAGE)
        c.box(4.5, 4.5, 30, 30, 1.2, SAGE_L, depth=.35)            # a shallow raised face inside the rim
        if state == 'sealed':
            c.box(4.5, 33, 30, 3.2, 1, BARK)                       # the band across the lower margin
            c.box(16.5, 31.8, 6, 5.6, 1.4, SAND)                   # the clasp
            c.groove(18.5, 34, 2, 1.2, SAND_D, 1.0)
    for x, y in ((3.3, 3.3), (35.7, 3.3), (3.3, 35.7), (35.7, 35.7)): c.disc(x, y, 1.1, SAND_D, lift=1)
    return c

if __name__ == "__main__":
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    for s in ('read', 'unread', 'sealed'):
        c = plate(s)
        c.render(shadow_k=0.4, shadow=(1.0, 1.3)).save(os.path.join(out, f'chapter-plate-{s}-40x40.png'))
        c.render(ground=(43, 48, 56), shadow=(1.0, 1.3)).save(os.path.join(out, f'proof-chapter-{s}-on-panel.png'))
