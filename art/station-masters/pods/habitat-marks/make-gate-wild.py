"""W1: gate-wild-shut-48x48 and gate-wild-open-48x48, the Wild module's field gate at (916, 416): two sage metal posts with sand
caps on a short strip of ground, a framed gate leaf of three bars between them with a sand latch; shut, then ajar (the leaf swung
toward the viewer on its left hinge, so it reads narrower and its free edge drops 2 px). Matte, lit from the top left, quieter than
the resident; opaque, with a soft contact shadow baked. Painted by hand in code with paintkit.py. usage: make-gate-wild.py OUT_DIR"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paintkit import *

def gate(open_):
    c = Canvas(48, 48)
    c.ellipse(24, 42.5, 21, 3.2, BARK, lift=0)                     # a short strip of trodden ground the gate stands on
    c.cyl_v(5, 12, 6, 31, SAGE); c.disc(8, 12, 3.6, SAND)          # the hinge post and its cap
    c.cyl_v(37, 12, 6, 31, SAGE); c.disc(40, 12, 3.6, SAND)        # the latch post
    if not open_:
        x0, x1, top, bot = 11.5, 36.5, 17, 39
        c.box(x0, top, x1 - x0, 3, 1.2, SAGE_L); c.box(x0, bot - 3, x1 - x0, 3, 1.2, SAGE_L)   # top and bottom rails
        c.box(x0, top, 3, bot - top, 1.2, SAGE_L); c.box(x1 - 3, top, 3, bot - top, 1.2, SAGE_L)
        for bx in (17.5, 22.5, 27.5): c.cyl_v(bx, top + 3, 2.4, bot - top - 6, SAGE)
        c.box(x0 + 2, 26.5, x1 - x0 - 4, 2.2, 1, SAGE)              # the mid rail
        c.box(32.5, 25, 7.5, 4, 1.2, SAND)                           # the latch across to the post
        c.box(5.5, 20, 7, 3, 1, SAND_D); c.box(5.5, 33, 7, 3, 1, SAND_D)   # hinges
    else:
        # the leaf swung open about 60 deg toward the viewer: 12 px wide, its free edge 2 px lower
        xa, xb = 11.5, 23.5; ta, tb, ba, bb = 17, 19, 39, 41
        c.poly([(xa, ta), (xb, tb), (xb, tb + 3), (xa, ta + 3)], 1.2, SAGE_L)
        c.poly([(xa, ba - 3), (xb, bb - 3), (xb, bb), (xa, ba)], 1.2, SAGE_L)
        c.poly([(xb - 2.5, tb), (xb, tb), (xb, bb), (xb - 2.5, bb)], 1.2, SAGE_L)    # the free stile, nearest the viewer
        for f in (.33, .6): 
            x = xa + 1 + (xb - xa - 3) * f; y0 = ta + 3 + (tb - ta) * f; y1 = ba - 3 + (bb - ba) * f
            c.cyl_v(x, y0, 1.8, y1 - y0, SAGE)
        c.poly([(xa + 1, 26.5), (xb - 1, 27.7), (xb - 1, 29.7), (xa + 1, 28.5)], 1, SAGE)
        c.box(xb - 1, 26.5, 4, 3.5, 1.2, SAND)                      # the latch, now on the swung leaf
        c.box(5.5, 20, 7, 3, 1, SAND_D); c.box(5.5, 33, 7, 3, 1, SAND_D)
        c.box(36, 25, 3, 4, 1, SAND_D)                               # the empty keeper on the latch post
    return c

if __name__ == "__main__":
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    for name, o in (("shut", False), ("open", True)):
        c = gate(o)
        c.render(shadow_k=0.45).save(os.path.join(out, f"gate-wild-{name}-48x48.png"))
        c.render(ground=(43, 48, 56)).save(os.path.join(out, f"proof-{name}-on-module.png"))
