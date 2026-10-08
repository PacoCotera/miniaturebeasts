"""Pawn studies A to F, hand-pixelled: the down walk (passing) frame and the right walk (contact) frame of six variants of the parka hood, one pose each,
no cycles. Built on the parts of pawn-draw.py (legs, coat, arms, pack, shadow, outline). What varies: the amount of face (a small face deep in the hood, a face
in shadow with only eyes and nose lit, a quarter-turned face), the goggles (on the brow on a 1 px strap, dropped over the eyes, none), the ruff (a 1 px ring
with breaks, a collar instead of a ring), and a side view where the face reads (the hood's brim in front of the brow, the eye and nose inside the ruff).
usage: python3 -I pawn-study.py OUT_DIR"""
import importlib.util, os, sys
out = sys.argv[1]; sys.argv = [sys.argv[0], out, "--coat", "glow"]
spec = importlib.util.spec_from_file_location("pd", os.path.join(os.path.dirname(os.path.abspath(__file__)), "pawn-draw.py")); pd = importlib.util.module_from_spec(spec); spec.loader.exec_module(pd)
os.makedirs(out, exist_ok=True)
CX, GY = pd.CX, pd.GY; ell, poly, rect = pd.ell, pd.poly, pd.rect
def tstrap(cv, x0, x1, y): cv.put([(x, y) for x in range(x0, x1 + 1)], "bark")                                   # a 1 px strap
def slens(cv, x, y):
    # a lens 4 x 3: a dark rim, two pixels of glass (ice and sky) over river
    cv.put([(x + 1, y), (x + 2, y), (x, y + 1), (x + 3, y + 1), (x + 1, y + 2), (x + 2, y + 2)], "soil"); cv.put([(x + 1, y + 1)], "white"); cv.put([(x + 2, y + 1)], "sky")
STUDIES = {
    "A": dict(face="deep", ruff="thin", gog="brow"), "B": dict(face="shadow", ruff="thin", gog="none"), "C": dict(face="ring", ruff="thin", gog="eyes"),
    "D": dict(face="deep", ruff="collar", gog="brow"), "E": dict(face="quarter", ruff="thin", gog="none"), "F": dict(face="ring", ruff="thin", gog="brow"),
}
HOOD = [(-7, -25), (6, -25), (7, -30), (5, -35), (3, -37), (-3, -37), (-6, -34), (-8, -29)]
def front_hood(cv, p, v):
    b = p["bob"]; fy = b + p["hood_dy"]; cv.part(poly([(CX + x, GY + y + (b if y == -25 else fy)) for x, y in HOOD]), "hood")
    f, r, g = v["face"], v["ruff"], v["gog"]
    def E(x0, y0, x1, y1): return ell(CX + x0, GY + y0 + fy, CX + x1, GY + y1 + fy)
    def P(pts, col): cv.put([(CX + x, GY + y + fy) for x, y in pts], col)
    # the ruff behind the face
    if r == "thin":
        cv.part(E(-6, -32, 5, -24), "fur"); P([(-6, -28), (5, -29), (-2, -32), (3, -24), (-5, -31)], "orange")            # a 1 px ring with breaks where the hood shows through
    elif r == "collar":
        cv.part(E(-5, -33, 4, -26), "hood"); cv.fill = None
        P([(x, y) for y in (-26, -25, -24) for x in range(-6, 6)], "paper"); P([(-7, -25), (6, -25), (-6, -23), (5, -23), (-3, -23), (2, -23)], "paper"); P([(x, -24) for x in range(-6, 6, 2)], "sand")
    # the face
    if f == "ring":
        cv.part(E(-5, -31, 4, -25), "skin", flat=True); P([(-3, -29), (-3, -28), (2, -29), (2, -28)], "ink"); P([(-1, -27)], "clay"); P([(-4, -27), (3, -27)], "coral")
    elif f == "deep":
        cv.part(E(-4, -31, 3, -25), "face" if False else "hood", flat=True); P([(x, y) for x in range(-3, 3) for y in range(-30, -26) if (x + 0.5) ** 2 / 9 + (y + 28.5) ** 2 / 4 <= 1.1], "peach")
        P([(x, -26) for x in range(-2, 2)], "clay") if False else None; P([(-2, -29), (1, -29)], "ink"); P([(-1, -27), (0, -27)], "clay")
        P([(x, -31) for x in range(-3, 3)], "rust"); P([(-4, y) for y in (-29, -28, -27)], "rust"); P([(3, y) for y in (-29, -28, -27)], "rust")     # the hood's shade round it
    elif f == "shadow":
        cv.part(E(-4, -31, 3, -25), "face", flat=True); P([(-2, -29), (1, -29)], "cream"); P([(-1, -27)], "peach"); P([(0, -27)], "clay")
    elif f == "quarter":
        cv.part(E(-3, -31, 5, -25), "skin", flat=True); P([(-3, y) for y in (-29, -28, -27)], "clay"); P([(3, -29), (3, -28)], "ink"); P([(-1, -29), (-1, -28)], "ink"); P([(4, -27)], "clay"); P([(2, -27)], "coral")
    if r == "thin" and f in ("ring", "quarter", "shadow", "deep"): pass
    # the goggles
    if g == "brow":
        tstrap(cv, CX - 8, CX + 7, GY - 33 + fy); slens(cv, CX - 5, GY - 34 + fy); slens(cv, CX + 1, GY - 34 + fy)
    elif g == "eyes":
        tstrap(cv, CX - 8, CX - 6, GY - 29 + fy); tstrap(cv, CX + 5, CX + 7, GY - 29 + fy); slens(cv, CX - 5, GY - 30 + fy); slens(cv, CX + 1, GY - 30 + fy); cv.put([(CX - 1, GY - 29 + fy), (CX, GY - 29 + fy)], "soil")
    cv.put([(CX - 4 + i, GY - 25 + b) for i in range(8)], "rust") if r != "collar" else None
def side_hood_v(v):
    def fn(cv, p, b, l, hy):
        f, r, g = v["face"], v["ruff"], v["gog"]; fy = b + hy
        cv.part(poly([(CX - 6 + l, GY - 25 + b), (CX + 5 + l, GY - 25 + b), (CX + 7 + l, GY - 30 + fy), (CX + 5 + l, GY - 35 + fy), (CX + 1 + l, GY - 38 + fy), (CX - 4 + l, GY - 39 + fy), (CX - 8 + l, GY - 36 + fy), (CX - 8 + l, GY - 30 + fy)]), "hood")
        def P(pts, col): cv.put([(CX + l + x, GY + fy + y) for x, y in pts], col)
        def E(x0, y0, x1, y1): return ell(CX + l + x0, GY + fy + y0, CX + l + x1, GY + fy + y1)
        if r == "collar": P([(x, y) for y in (-26, -25, -24) for x in range(-5, 8)], "paper"); P([(x, -24) for x in range(-5, 8, 2)], "sand")
        else: cv.part(E(1, -34, 8, -24) if r != "thin" else E(1, -33, 8, -24), "fur")
        # the face lies inside the ruff: nothing leaves its edge; the brim of the hood comes down in front of the brow
        if f in ("ring", "quarter"):
            cv.part(E(2, -31, 6, -26), "skin", flat=True); P([(4, -29), (4, -28)], "ink"); P([(6, -27)], "clay"); P([(3, -27)], "coral")
        elif f == "deep":
            cv.part(E(3, -30, 6, -27), "peach" if False else "skin", flat=True); P([(4, -28)], "ink"); P([(6, -27)], "clay"); P([(x, -31) for x in range(3, 8)], "rust")
        elif f == "shadow":
            cv.part(E(2, -31, 6, -26), "face", flat=True); P([(4, -29)], "cream"); P([(6, -27)], "peach")
        cv.part(poly([(CX + l + 0, GY + fy - 35), (CX + l + 7, GY + fy - 35), (CX + l + 8, GY + fy - 31), (CX + l + 4, GY + fy - 31), (CX + l + 1, GY + fy - 32)]), "hood")   # the brim, in front of the brow
        if g == "brow": tstrap(cv, CX + l - 8, CX + l + 7, GY + fy - 33); slens(cv, CX + l + 3, GY + fy - 34)
        elif g == "eyes": tstrap(cv, CX + l - 8, CX + l + 2, GY + fy - 29); slens(cv, CX + l + 3, GY + fy - 30)
        P([(i - 3, -25) for i in range(8)], "rust") if r != "collar" else None
    return fn
def down_frame(v):
    cv = pd.Canvas(); p = pd.WALK[1]; pd.legs_fb(cv, p); pd.torso_fb(cv, p); pd.arms_fb(cv, p); front_hood(cv, p, v); pd.shadow(cv, 1); return pd.finish(cv)
def side_frame(v):
    cv = pd.side_frame(pd.WALK[0], hood_fn=side_hood_v(v)); pd.shadow(cv, 0); return pd.finish(cv)
for k, v in STUDIES.items():
    pd.quant.save_indexed(down_frame(v), os.path.join(out, f"pawn-{k}-down.png")); pd.quant.save_indexed(side_frame(v), os.path.join(out, f"pawn-{k}-side.png"))
print("pawn studies", " ".join(STUDIES))
