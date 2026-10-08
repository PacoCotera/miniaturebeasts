"""Pawn I, the art director's round 8 study: A's front with C's side view, in the concept's proportions: chunky and head-heavy (a hood of 20 rows
over a torso of 11 and legs of 6 and boots of 3), a bigger hood mass, shorter legs, trousers a light stone grey (not navy). The goggles' lenses rest on the
hood's brim and the 1 px strap stays inside the hood's outline (one pixel in from it, under its lit edge); the nose is 0 to 1 px; the fur is a thin
ring with breaks. Front: a small face deep in the hood. Side: the goggles over the eye, the strap running back inside the hood.
Draws the down walk (passing) frame and the right walk (contact) frame. usage: python3 -I pawn-chunky.py OUT_DIR"""
import importlib.util, os, sys
out = sys.argv[1]; sys.argv = [sys.argv[0], out, "--coat", "glow"]
spec = importlib.util.spec_from_file_location("pd", os.path.join(os.path.dirname(os.path.abspath(__file__)), "pawn-draw.py")); pd = importlib.util.module_from_spec(spec); spec.loader.exec_module(pd)
os.makedirs(out, exist_ok=True)
CX, GY = pd.CX, pd.GY; ell, poly, rect, C, quant = pd.ell, pd.poly, pd.rect, pd.C, pd.quant
pd.RAMPS["trou"] = ("fog", "mist", "stone", "slate"); pd.RAMPS["trou_far"] = ("mist", "stone", "slate", "night")
def inside(cv_mask, x, y, margin=1):   # a pixel is inside the hood's outline if it and its neighbours in the row are in the mask
    return cv_mask[y, x] and cv_mask[y, x - margin] and cv_mask[y, x + margin]
def tstrap(cv, m, x0, x1, y):
    cv.put([(x, y) for x in range(x0, x1 + 1) if inside(m, x, y)], "bark")                                  # never past the silhouette
def slens(cv, x, y):
    cv.put([(x + 1, y), (x + 2, y), (x, y + 1), (x + 3, y + 1), (x + 1, y + 2), (x + 2, y + 2)], "soil"); cv.put([(x + 1, y + 1)], "white"); cv.put([(x + 2, y + 1)], "sky")
def hood_mask_front(l=0, fy=0):
    return poly([(CX - 8 + l, GY - 19 + fy), (CX + 7 + l, GY - 19 + fy), (CX + 8 + l, GY - 26 + fy), (CX + 8 + l, GY - 32 + fy), (CX + 5 + l, GY - 36 + fy), (CX + 2 + l, GY - 38 + fy), (CX - 2 + l, GY - 38 + fy), (CX - 5 + l, GY - 36 + fy), (CX - 9 + l, GY - 32 + fy), (CX - 9 + l, GY - 26 + fy)])
def down(p):
    cv = pd.Canvas(); b = p["bob"]; l = p["lean"]
    # legs: short, a mid grey
    for side, (lx0, lx1) in ((-1, (CX - 5, CX - 2)), (1, (CX + 1, CX + 4))):
        lift = p["lift"][0 if side < 0 else 1]; top = GY - 9 + b; bot = GY - 4 - lift
        cv.part(rect(lx0, top, lx1, bot), "trou"); cv.part(rect(lx0 - 1, bot + 1, lx1 + 1, bot + 3), "boot"); cv.px([(lx0 - 1, bot + 3), (lx1 + 1, bot + 3)], "ink")
    # the coat: a chunky body
    cv.part(poly([(CX - 8 + l, GY - 19 + b), (CX + 7 + l, GY - 19 + b), (CX + 6 + l, GY - 9 + b), (CX - 7 + l, GY - 9 + b)]), "coat")
    cv.part(rect(CX - 7 + l, GY - 12 + b, CX + 6 + l, GY - 11 + b), "pack", flat=True); cv.px([(CX - 1 + l, GY - 12 + b), (CX + l, GY - 12 + b)], "gold")
    for i in range(8): cv.put([(CX - 6 + l + (i * 3) // 8, GY - 19 + b + i)], "bark"); cv.put([(CX + 5 + l - (i * 3) // 8, GY - 19 + b + i)], "bark")
    for side, x0 in ((-1, CX - 11 + l), (1, CX + 8 + l)):
        sw = p["arm"][0 if side < 0 else 1]
        cv.part(rect(x0, GY - 19 + b + (1 if sw < 0 else 0), x0 + 2, GY - 11 + b - max(sw, 0)), "coat"); cv.part(rect(x0, GY - 10 + b - max(sw, 0), x0 + 2, GY - 8 + b - max(sw, 0)), "mitt")
    # the hood: a big mass; the face small and deep behind a dark rim; a thin ring of fur with breaks; the goggles resting on the brim
    fy = b + p["hood_dy"]; hm = hood_mask_front(l, fy); cv.part(hm, "hood")
    def E(x0, y0, x1, y1): return ell(CX + x0 + l, GY + y0 + fy, CX + x1 + l, GY + y1 + fy)
    def P(pts, col): cv.put([(CX + x + l, GY + y + fy) for x, y in pts], col)
    cv.part(E(-5, -30, 4, -20), "fur"); P([(-5, -25), (4, -26), (-2, -30), (2, -20), (-4, -28)], "orange")             # a 1 px ring with breaks
    cv.part(E(-4, -29, 3, -21), "hood", flat=True); cv.fill = None
    P([(x, -29) for x in range(-3, 3)], "rust"); P([(-4, y) for y in (-27, -26, -25, -24)], "rust"); P([(3, y) for y in (-27, -26, -25, -24)], "rust")           # the hood's shade round the face
    cv.part(E(-3, -28, 2, -22), "skin", flat=True); P([(-2, -26), (1, -26)], "ink"); P([(-1, -24)], "clay")                                                       # two eyes, a 1 px nose
    P([(x, -22) for x in range(-2, 2)], "clay") if False else None
    by = GY - 31 + fy                                                                                              # the brim: the hood's lit edge across the brow
    tstrap(cv, hm, CX - 8 + l, CX + 7 + l, by); slens(cv, CX - 5 + l, by - 1); slens(cv, CX + 1 + l, by - 1)
    cv.put([(CX - 7 + l + i, GY - 19 + b) for i in range(14)], "rust")
    pd.shadow(cv, 1); return pd.finish(cv)
def side(p):
    cv = pd.Canvas(); b = p["bob"]; l = p["lean"]; s = p["stride"]; lf = p["lift"]
    def leg(dx, lift, far):
        bot = GY - 4 - lift; x0 = CX - 2 + dx
        cv.part(rect(x0, GY - 9 + b, x0 + 3, bot), "trou_far" if far else "trou"); cv.part(rect(x0, bot + 1, x0 + 5, bot + 3), "boot")
    leg(-s, lf[0], True)
    cv.part(rect(CX - 14 + l, GY - 20 + b, CX - 6 + l, GY - 8 + b), "pack"); cv.part(rect(CX - 15 + l, GY - 24 + b, CX - 5 + l, GY - 20 + b), "roll")
    cv.px([(CX - 10 + l, GY - 24 + b + i) for i in range(5)], "bark"); cv.px([(CX - 14 + l + i, GY - 14 + b) for i in range(9)], "soil"); cv.put([(CX - 10 + l, GY - 13 + b)], "gold")
    cv.put([(CX - 15 + l, GY - 17 + b), (CX - 15 + l, GY - 16 + b)], "amber")
    leg(s, lf[1], False)
    cv.part(poly([(CX - 6 + l, GY - 19 + b), (CX + 6 + l, GY - 19 + b), (CX + 6 + l, GY - 9 + b), (CX - 6 + l, GY - 9 + b)]), "coat")
    cv.part(rect(CX - 6 + l, GY - 12 + b, CX + 6 + l, GY - 11 + b), "pack", flat=True); cv.put([(CX + 5 + l, GY - 12 + b)], "gold")
    a = p["arm"][0]; x0 = CX - 1 + l + a; cv.part(rect(x0, GY - 19 + b, x0 + 2, GY - 11 + b), "coat"); cv.part(rect(x0, GY - 10 + b, x0 + 2, GY - 8 + b), "mitt")
    fy = b + p["hood_dy"]
    hm = poly([(CX - 7 + l, GY - 19 + b), (CX + 7 + l, GY - 19 + b), (CX + 9 + l, GY - 26 + fy), (CX + 8 + l, GY - 32 + fy), (CX + 4 + l, GY - 37 + fy), (CX - 1 + l, GY - 40 + fy), (CX - 6 + l, GY - 40 + fy), (CX - 10 + l, GY - 36 + fy), (CX - 11 + l, GY - 28 + fy)])
    cv.part(hm, "hood")
    def E(x0, y0, x1, y1): return ell(CX + x0 + l, GY + y0 + fy, CX + x1 + l, GY + y1 + fy)
    def P(pts, col): cv.put([(CX + x + l, GY + fy + y) for x, y in pts], col)
    cv.part(E(1, -30, 9, -20), "fur")                                                                                  # a thin crescent of fur round the face
    cv.part(E(2, -29, 8, -21), "skin", flat=True)
    P([(x, -29) for x in range(3, 8)], "rust"); P([(x, -28) for x in range(3, 8)], "rust") if False else None
    # C's side view: the goggles over the eye, a lens on the face, the strap running back inside the hood
    sy = GY - 26 + fy
    tstrap(cv, hm, CX - 10 + l, CX + 2 + l, sy); slens(cv, CX + 3 + l, sy - 1)
    P([(7, -23)], "clay")                                                                                              # the nose: 1 px, inside the fur
    cv.put([(CX - 6 + l + i, GY - 19 + b) for i in range(12)], "rust")
    pd.shadow(cv, 0); return pd.finish(cv)
P_DOWN = pd.WALK[1]; P_SIDE = pd.WALK[0]
quant.save_indexed(down(P_DOWN), os.path.join(out, "pawn-I-down.png")); quant.save_indexed(side(P_SIDE), os.path.join(out, "pawn-I-side.png")); print("pawn I")
