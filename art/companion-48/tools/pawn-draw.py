"""The explorer pawn, drawn: a small figure in a hooded slicker with a pack, 4 facings x (walk 3, creep 3, react), 48 px cells,
the foot at y 46, a ground shadow in the cell. Every part is a hand-set mask (rectangles, ellipses, polygons rasterised without
anti-aliasing), shaded by the rim rule (lit on the top and left edge, shade on the bottom and right) with the folds and the
face set pixel by pixel; the outline rule is quant.outline. usage: python3 -I pawn-draw.py OUT_DIR [--coat yellow|amber|orange]"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
import quant
P = quant.P; C = P.index
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
coat = sys.argv[sys.argv.index("--coat") + 1] if "--coat" in sys.argv else "yellow"
N = 48; CX = 24; GY = 46
RAMPS = {
    "coat": {"yellow": ("cream", "yellow", "amber", "orange"), "amber": ("yellow", "amber", "orange", "rust"), "orange": ("amber", "orange", "rust", "soil")}[coat],
    "hood": {"yellow": ("cream", "yellow", "amber", "orange"), "amber": ("yellow", "amber", "orange", "rust"), "orange": ("amber", "orange", "rust", "soil")}[coat], "pants_far": ("slate", "night", "ink", "ink"),
    "pack": ("clay", "bark", "soil", "ink"), "roll": ("paper", "sand", "clay", "bark"),
    "pants": ("stone", "slate", "night", "ink"), "boot": ("bark", "soil", "ink", "void"), "mitt": ("sand", "clay", "bark", "soil"),
    "face": ("night", "night", "ink", "ink"), "scarf": ("coral", "red", "wine", "wine"),
}
def mask(draw_fn):
    im = Image.new("L", (N, N), 0); d = ImageDraw.Draw(im); draw_fn(d); return np.asarray(im) > 0
def rect(x0, y0, x1, y1): return mask(lambda d: d.rectangle([x0, y0, x1, y1], fill=255))
def ell(x0, y0, x1, y1): return mask(lambda d: d.ellipse([x0, y0, x1, y1], fill=255))
def poly(pts): return mask(lambda d: d.polygon(pts, fill=255))
def sh(m, dx, dy):
    o = np.zeros_like(m)
    ys, xs = np.where(m); ys2, xs2 = ys + dy, xs + dx; ok = (ys2 >= 0) & (ys2 < N) & (xs2 >= 0) & (xs2 < N); o[ys2[ok], xs2[ok]] = True; return o
class Canvas:
    def __init__(self): self.idx = np.full((N, N), -1, dtype=np.int64)
    def part(self, m, ramp, flat=False):
        lit, base, shade, deep = (C[n] for n in RAMPS[ramp])
        self.idx[m] = base
        if flat: return
        top = m & ~sh(m, 0, 1); left = m & ~sh(m, 1, 0); bot = m & ~sh(m, 0, -1); right = m & ~sh(m, -1, 0)
        self.idx[(top | left) & ~(bot | right)] = lit
        self.idx[(bot | right) & ~(top | left)] = shade
        self.idx[bot & right] = deep
    def px(self, pts, col):
        for x, y in pts:
            if 0 <= x < N and 0 <= y < N and self.idx[y, x] >= 0: self.idx[y, x] = C[col]
    def put(self, pts, col):   # also where nothing is drawn yet
        for x, y in pts:
            if 0 <= x < N and 0 <= y < N: self.idx[y, x] = C[col]
def shadow(cv, dx=1):
    m = ell(CX - 9 + dx, GY - 4, CX + 8 + dx, GY - 1); cv.idx[m & (cv.idx < 0)] = C["night"]
def finish(cv):
    o = quant.outline(cv.idx)
    # the outline rule must not paint the shadow's rim in the pawn's own ramps: keep the shadow as it was
    sh_ = cv.idx == C["night"]; o[sh_] = C["night"]; return o
# ---------------------------------------------------------------- front and back
def legs_fb(cv, p, back=False):
    for side, (lx0, lx1) in ((-1, (CX - 5, CX - 2)), (1, (CX + 1, CX + 4))):
        lift = p["lift"][0 if side < 0 else 1]; top = GY - 12 + p["bob"] + (p["crouch"] if p["crouch"] else 0)
        bot = GY - 4 - lift
        cv.part(rect(lx0, top, lx1, bot), "pants")
        cv.part(rect(lx0 - 1, bot + 1, lx1 + 1, bot + 3), "boot")
        cv.px([(lx0 - 1, bot + 3), (lx1 + 1, bot + 3)], "ink")
def torso_fb(cv, p, back=False):
    b = p["bob"]; l = p["lean"]
    cv.part(poly([(CX - 7 + l, GY - 25 + b), (CX + 6 + l, GY - 25 + b), (CX + 5 + l, GY - 12 + b), (CX - 6 + l, GY - 12 + b)]), "coat")
    cv.part(rect(CX - 6 + l, GY - 15 + b, CX + 5 + l, GY - 13 + b), "scarf" if False else "pack", flat=True)       # belt
    cv.px([(CX - 1 + l, GY - 14 + b), (CX + l, GY - 14 + b)], "gold")                                         # buckle
    if not back:
        cv.put([(CX - 4 + l + i, GY - 24 + b + i * 1) for i in range(0, 8, 1) if False], "soil")
        for i in range(10): cv.put([(CX - 5 + l + (i * 3) // 10, GY - 24 + b + i)], "bark")                    # straps
        for i in range(10): cv.put([(CX + 4 + l - (i * 3) // 10, GY - 24 + b + i)], "bark")
def arms_fb(cv, p, back=False, up=False):
    b = p["bob"]; l = p["lean"]
    for side, x0 in ((-1, CX - 10 + l), (1, CX + 7 + l)):
        sw = p["arm"][0 if side < 0 else 1]
        if up:   # react: arms raised at the sides
            cv.part(rect(x0, GY - 30 + b, x0 + 2, GY - 21 + b), "coat")
            cv.part(rect(x0, GY - 33 + b, x0 + 2, GY - 30 + b), "mitt")
        else:
            cv.part(rect(x0, GY - 24 + b + (1 if sw < 0 else 0), x0 + 2, GY - 14 + b - max(sw, 0)), "coat")
            cv.part(rect(x0, GY - 13 + b - max(sw, 0), x0 + 2, GY - 11 + b - max(sw, 0)), "mitt")
def hood_front(cv, p):
    b = p["bob"]; l = p["lean"]; hy = p["hood_dy"]
    cv.part(poly([(CX - 7 + l, GY - 25 + b), (CX + 6 + l, GY - 25 + b), (CX + 7 + l, GY - 30 + b + hy), (CX + 5 + l, GY - 35 + b + hy), (CX + 3 + l, GY - 37 + b + hy), (CX - 3 + l, GY - 37 + b + hy), (CX - 6 + l, GY - 34 + b + hy), (CX - 8 + l, GY - 29 + b + hy)]), "hood")
    cv.part(ell(CX - 4 + l, GY - 33 + b + hy, CX + 4 + l, GY - 26 + b + hy), "face", flat=True)
    # the rim of the opening: a lit line over its top, a shade line under it
    cv.px([(CX - 3 + l + i, GY - 34 + b + hy) for i in range(8)], "yellow")
    cv.px([(CX - 6 + l, GY - 31 + b + hy), (CX - 5 + l, GY - 33 + b + hy)], "yellow")
    cv.put([(CX - 3 + l, GY - 30 + b + hy), (CX - 2 + l, GY - 30 + b + hy), (CX + 1 + l, GY - 30 + b + hy), (CX + 2 + l, GY - 30 + b + hy)], p["eyes"])
    cv.put([(CX - 4 + l + i, GY - 25 + b) for i in range(8)], "wine")                                          # the scarf at the neck
    cv.put([(CX - 3 + l + i, GY - 26 + b) for i in range(6)], "red")
def hood_back(cv, p):
    b = p["bob"]; l = p["lean"]; hy = p["hood_dy"]
    cv.part(poly([(CX - 7 + l, GY - 25 + b), (CX + 6 + l, GY - 25 + b), (CX + 7 + l, GY - 30 + b + hy), (CX + 5 + l, GY - 35 + b + hy), (CX + 3 + l, GY - 37 + b + hy), (CX - 3 + l, GY - 37 + b + hy), (CX - 6 + l, GY - 34 + b + hy), (CX - 8 + l, GY - 29 + b + hy)]), "hood")
    cv.px([(CX - 1 + l, GY - 35 + b + hy + i) for i in range(9)], "orange")                                    # the seam
    cv.px([(CX - 1 + l + (1 if i % 2 else 0), GY - 28 + b + hy + i) for i in range(3)], "rust")
    cv.put([(CX - 4 + l + i, GY - 25 + b) for i in range(8)], "wine")
def pack_back(cv, p):
    b = p["bob"]; l = p["lean"]
    cv.part(rect(CX - 6 + l, GY - 24 + b, CX + 5 + l, GY - 12 + b), "pack")
    cv.part(rect(CX - 7 + l, GY - 28 + b, CX + 6 + l, GY - 24 + b), "roll")                                     # the bedroll across the top
    cv.px([(CX - 3 + l, GY - 28 + b + i) for i in range(5)], "bark"); cv.px([(CX + 2 + l, GY - 28 + b + i) for i in range(5)], "bark")
    cv.px([(CX - 6 + l + i, GY - 18 + b) for i in range(12)], "soil")                                           # the flap line
    cv.put([(CX + l, GY - 17 + b), (CX + 1 + l, GY - 17 + b)], "gold")
    cv.put([(CX + 6 + l, GY - 21 + b), (CX + 6 + l, GY - 20 + b), (CX + 6 + l, GY - 19 + b)], "amber")        # a small lantern hung at the side
    cv.put([(CX + 6 + l, GY - 22 + b)], "ink")
# ---------------------------------------------------------------- side (facing right; left is the mirror)
def side_frame(p, up_arm=False):
    cv = Canvas(); b = p["bob"]; l = p["lean"]; hy = p["hood_dy"]; s = p["stride"]; lf = p["lift"]
    # far leg (darker), far arm, then pack, near leg, torso, near arm, hood
    top = GY - 12 + b + p["crouch"]
    def leg(dx, lift, far):
        bot = GY - 4 - lift; x0 = CX - 2 + dx
        cv.part(rect(x0, top, x0 + 3, bot), "pants_far" if far else "pants")
        cv.part(rect(x0, bot + 1, x0 + 5, bot + 3), "boot")
    leg(-s, lf[0], True)
    ax = CX - 1 + l
    if not up_arm:
        cv.part(rect(ax - p["arm"][0] // 2 - 1, GY - 24 + b, ax - p["arm"][0] // 2, GY - 15 + b), "coat"); cv.px([(ax - p["arm"][0] // 2 - 1, GY - 24 + b + i) for i in range(10)], "orange")
    cv.part(rect(CX - 10 + l, GY - 24 + b, CX - 4 + l, GY - 12 + b), "pack")
    cv.part(rect(CX - 11 + l, GY - 28 + b, CX - 3 + l, GY - 24 + b), "roll")
    cv.px([(CX - 7 + l, GY - 28 + b + i) for i in range(5)], "bark")
    cv.px([(CX - 10 + l + i, GY - 18 + b) for i in range(7)], "soil"); cv.put([(CX - 7 + l, GY - 17 + b)], "gold")
    cv.put([(CX - 11 + l, GY - 21 + b), (CX - 11 + l, GY - 20 + b)], "amber")
    leg(s, lf[1], False)
    cv.part(poly([(CX - 5 + l, GY - 25 + b), (CX + 4 + l, GY - 25 + b), (CX + 4 + l, GY - 12 + b), (CX - 5 + l, GY - 12 + b)]), "coat")
    cv.part(rect(CX - 5 + l, GY - 15 + b, CX + 4 + l, GY - 13 + b), "pack", flat=True); cv.put([(CX + 3 + l, GY - 14 + b)], "gold")
    cv.px([(CX - 4 + l + i // 2, GY - 24 + b + i) for i in range(9)], "bark")                                   # the pack strap
    if up_arm:
        cv.part(rect(CX + 5 + l, GY - 30 + b, CX + 7 + l, GY - 20 + b), "coat"); cv.part(rect(CX + 5 + l, GY - 33 + b, CX + 7 + l, GY - 30 + b), "mitt")
    else:
        a = p["arm"][0]; x0 = CX - 1 + l + a
        cv.part(rect(x0, GY - 24 + b, x0 + 2, GY - 14 + b), "coat"); cv.part(rect(x0, GY - 13 + b, x0 + 2, GY - 11 + b), "mitt")
    # the hood: a dome with a peak that trails back, the opening on the front
    cv.part(poly([(CX - 6 + l, GY - 25 + b), (CX + 5 + l, GY - 25 + b), (CX + 7 + l, GY - 30 + b + hy), (CX + 5 + l, GY - 35 + b + hy), (CX + 1 + l, GY - 38 + b + hy), (CX - 4 + l, GY - 39 + b + hy), (CX - 8 + l, GY - 36 + b + hy), (CX - 8 + l, GY - 30 + b + hy)]), "hood")
    cv.part(ell(CX + 0 + l, GY - 34 + b + hy, CX + 6 + l, GY - 26 + b + hy), "face", flat=True)
    cv.px([(CX + 1 + l + i, GY - 35 + b + hy) for i in range(5)], "yellow")
    cv.put([(CX + 3 + l, GY - 30 + b + hy), (CX + 4 + l, GY - 30 + b + hy)], p["eyes"])
    cv.put([(CX - 3 + l + i, GY - 25 + b) for i in range(8)], "wine")
    return cv
# ---------------------------------------------------------------- poses
def pose(**k):
    d = dict(bob=0, lean=0, hood_dy=0, lift=(0, 0), arm=(0, 0), stride=0, crouch=0, eyes="cream"); d.update(k); return d
WALK = [pose(lift=(2, 0), arm=(2, -2), stride=4, bob=0), pose(lift=(0, 0), arm=(0, 0), stride=0, bob=-1), pose(lift=(0, 2), arm=(-2, 2), stride=-4, bob=0)]
CREEP = [pose(lift=(1, 0), arm=(1, -1), stride=3, bob=3, crouch=0, lean=1, hood_dy=1), pose(lift=(0, 0), arm=(0, 0), stride=0, bob=4, lean=1, hood_dy=1), pose(lift=(0, 1), arm=(-1, 1), stride=-3, bob=3, lean=1, hood_dy=1)]
REACT = pose(bob=-2, lift=(2, 2), arm=(0, 0), eyes="cream", hood_dy=0)
def frame(facing, p, up_arm=False):
    if facing in ("left", "right"):
        cv = side_frame(p, up_arm)
        shadow(cv, 0)
        o = finish(cv)
        return o[:, ::-1].copy() if facing == "left" else o
    cv = Canvas()
    if facing == "down":
        legs_fb(cv, p); torso_fb(cv, p); arms_fb(cv, p, up=up_arm); hood_front(cv, p)
    else:
        legs_fb(cv, p); arms_fb(cv, p, up=up_arm); pack_back(cv, p); hood_back(cv, p)
    shadow(cv, 1); return finish(cv)
for facing in ("down", "up", "left", "right"):
    for i, p in enumerate(WALK): quant.save_indexed(frame(facing, p), os.path.join(out, f"pawn-{facing}-walk{i + 1}.png"))
    for i, p in enumerate(CREEP): quant.save_indexed(frame(facing, p), os.path.join(out, f"pawn-{facing}-creep{i + 1}.png"))
    quant.save_indexed(frame(facing, REACT, up_arm=True), os.path.join(out, f"pawn-{facing}-react.png"))
print("pawn 4 facings x 7 frames, coat", coat)
