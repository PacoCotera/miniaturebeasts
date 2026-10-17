"""T-20261016-156 (specs/station-fix5-cargo-spec.md, "Amendment (T-20261016-155)"; specs/world-events.md §5): the world row's marks for the
Cargo report card, drawn by hand in code at their sizes, in the house's small-mark look on the door's dark display: flat shapes, one key from
the top left as a lit upper edge, no glow, no anti-aliasing past a 1 px edge. R6 holds on the card: no amber, gold or white; the partner ring's
teal is the spec's own.
- world-mark-{sprout,cane,lamp-low,lamp-out,bolt,fruit,glint,pair,still}-24x24: grown (a sprout), elder (a walking cane), an outpost's lamp
  low (a lantern, its flame small, cream) or out (the lantern dark), storm (a bolt, yellow), fruit (a round fruit, red, with a leaf), stirring
  (the four-point glint, in cream: the house glint's gold is not allowed on the card), young (a small pair: a large and a small round body),
  quiet (the still mark: a level line with a dot over it).
- world-herd-{1..8}-20x16: the hoof-trail arrow turned to n (1 N, 2 NE ... 8 NW): two staggered hoof prints and an arrowhead.
- world-land-32x32: the plain land mark for shallows and cliff: a round badge of plain sage ground with a level horizon, in the place badges'
  round cut and rim.
The sun mark is the existing frame-sun-16; the place badges are the existing place-{g}-32x32 (T-31, T-35, T-98).
usage: python3 -I cargo-report/t156/make-world-marks.py OUT_DIR   (run in art/station-masters/pods)"""
import sys, os, json, numpy as np
from PIL import Image
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
pal = dict(json.load(open("../../../prototypes/ui/palettes/station.json"))["colours"])
P = lambda n: np.array([int(pal[n][i:i + 2], 16) for i in (1, 3, 5)], float)
def lin(c): c = np.asarray(c, float) / 255; return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
def srgb(l): l = np.clip(l, 0, 1); return np.where(l <= .0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - .055) * 255
S = 8
soft = lambda d: np.clip(d / 0.6 + 0.5, 0, 1)
def canvas(w, h): y, x = (np.mgrid[0:h * S, 0:w * S] + .5) / S; return y, x
def render(w, h, items, name):
    col = np.zeros((h * S, w * S, 3)); A = np.zeros((h * S, w * S))
    for cov, rgb in items:
        c = np.clip(cov, 0, 1); col = col * (1 - c[..., None]) + lin(rgb) * c[..., None]; A = A + c * (1 - A)
    a1 = A.reshape(h, S, w, S).mean((1, 3)); c1 = col.reshape(h, S, w, S, 3).mean((1, 3)) / np.maximum(a1, 1e-6)[..., None]
    Image.fromarray(np.clip(np.rint(np.dstack([srgb(c1), a1 * 255])), 0, 255).astype(np.uint8), "RGBA").save(os.path.join(out, name + ".png"))
def disc(x, y, cx, cy, r): return soft(r - np.hypot(x - cx, y - cy))
def box(x, y, x0, y0, x1, y1): return np.minimum.reduce([soft(x - x0), soft(x1 - x), soft(y - y0), soft(y1 - y)])
def seg(x, y, ax, ay, bx, by, w):
    dx, dy = bx - ax, by - ay; t = np.clip(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1)
    return soft(w / 2 - np.hypot(x - (ax + t * dx), y - (ay + t * dy)))
def lit(m, x, y, ox=-0.9, oy=-0.9):                                       # the upper-left lit edge of a shape
    sh = np.roll(np.roll(m, int(-oy * S), 0), int(-ox * S), 1); return np.clip(m - sh, 0, 1)
BONE, MIST, FOG = P("bone"), P("mist"), P("fog")
y, x = canvas(24, 24)
# sprout: a stem and two leaves
stem = seg(x, y, 12, 21, 12, 11, 2.0)
leafL = soft((1 - np.hypot(((x - 8.0) * 0.8 + (y - 10) * 0.6) / 4.2, (-(x - 8.0) * 0.6 + (y - 10) * 0.8) / 2.0)) * 2)
leafR = soft((1 - np.hypot(((x - 16.0) * 0.8 - (y - 8) * 0.6) / 4.2, ((x - 16.0) * 0.6 + (y - 8) * 0.8) / 2.0)) * 2)
leaf = np.maximum(leafL, leafR)
render(24, 24, [(stem, P("sprout") * 0.8), (leaf, P("sprout")), (lit(leaf, x, y), P("lime"))], "world-mark-sprout-24x24")
# cane: a walking stick with a crook
crook = np.minimum(soft(np.hypot(x - 10, y - 7) - 2.6), soft(4.4 - np.hypot(x - 10, y - 7))) * (y < 7.6)
cane = np.maximum(seg(x, y, 14.0, 7.4, 14.0, 21.5, 2.2), crook)
render(24, 24, [(cane, P("clay")), (lit(cane, x, y), P("sand"))], "world-mark-cane-24x24")
# the lantern: a cap, a ring, a glass body; low: a small cream flame; out: dark glass
def lantern(flame):
    body = box(x, y, 7.5, 8, 16.5, 20); cap = box(x, y, 8.5, 6, 15.5, 8.2); ring = np.minimum(soft(np.hypot(x - 12, y - 4.4) - 1.2), soft(2.3 - np.hypot(x - 12, y - 4.4)))
    glass = box(x, y, 9, 9.5, 15, 18.5); base = box(x, y, 7, 19.5, 17, 21)
    items = [(np.maximum.reduce([body, cap, ring, base]), P("metal")), (glass, P("ink"))]
    if flame: items.append((soft((1 - np.hypot((x - 12) / 1.6, (y - 15.4) / 2.6)) * 2), P("cream")))
    items.append((lit(np.maximum(cap, body), x, y), P("enamel")))
    return items
render(24, 24, lantern(True), "world-mark-lamp-low-24x24"); render(24, 24, lantern(False), "world-mark-lamp-out-24x24")
# bolt
poly = [(14, 2), (6, 13.5), (11.5, 13.5), (9, 22), (18, 9.5), (12.5, 9.5), (15.5, 2)]
from PIL import ImageDraw
def polymask(w, h, pts):
    im = Image.new("L", (w * S, h * S), 0); ImageDraw.Draw(im).polygon([(px * S, py * S) for px, py in pts], fill=255); return np.asarray(im).astype(float) / 255
bolt = polymask(24, 24, poly)
render(24, 24, [(bolt, P("yellow")), (lit(bolt, x, y), P("cream"))], "world-mark-bolt-24x24")
# fruit: a round fruit, a stem and a leaf
fr = disc(x, y, 12, 14.5, 7.0); st = seg(x, y, 12, 8, 12.8, 4.6, 1.6)
lf = soft((1 - np.hypot(((x - 16) * 0.8 - (y - 5.5) * 0.6) / 3.2, ((x - 16) * 0.6 + (y - 5.5) * 0.8) / 1.5)) * 2)
render(24, 24, [(fr, P("red")), (soft(2.4 - np.hypot(x - 9.6, y - 11.8)), P("coral")), (st, P("bark")), (lf, P("leaf"))], "world-mark-fruit-24x24")
# glint: the house four-point glint, cream
dx, dy = np.abs(x - 12) / 10.5, np.abs(y - 12) / 10.5
render(24, 24, [(soft((1 - (dx ** (2 / 3) + dy ** (2 / 3))) * 9), P("cream"))], "world-mark-glint-24x24")
# young: a small pair, a large round body and a small one beside it
big = np.maximum(disc(x, y, 9.5, 14, 5.6), disc(x, y, 9.5, 7.2, 3.2)); small = np.maximum(disc(x, y, 17.5, 16.5, 3.6), disc(x, y, 17.5, 11.6, 2.2))
render(24, 24, [(big, FOG), (lit(big, x, y), BONE), (small, FOG), (lit(small, x, y), BONE)], "world-mark-pair-24x24")
# still: a level line with a dot over it
still = np.maximum(box(x, y, 4, 15, 20, 17.2), disc(x, y, 12, 10, 2.4))
render(24, 24, [(still, MIST)], "world-mark-still-24x24")
# the herd arrow, 20 x 16, in 8 directions: two staggered hoof prints and an arrowhead, drawn along the direction
for n in range(1, 9):
    yy, xx = canvas(20, 16); a = np.radians(45 * (n - 1)); ux, uy = np.sin(a), -np.cos(a); vx, vy = -uy, ux
    u = (xx - 10) * ux + (yy - 8) * uy; v = (xx - 10) * vx + (yy - 8) * vy
    hoof = lambda cu, cv: np.maximum(soft((1 - np.hypot((u - cu) / 1.8, (v - cv - 0.9) / 0.8)) * 1.6), soft((1 - np.hypot((u - cu) / 1.8, (v - cv + 0.9) / 0.8)) * 1.6))
    prints = np.maximum(hoof(-5.0, 2.2), hoof(-1.5, -2.2))
    head = np.minimum.reduce([soft(u - 1.5), soft((6.5 - u) - np.abs(v) * 0.9), soft(5.0 - np.abs(v))])
    render(20, 16, [(prints, MIST), (head, BONE)], f"world-herd-{n}-20x16")
# the plain land mark, 32 x 32, in the place badges' round cut
y, x = canvas(32, 32); circ = disc(x, y, 16, 16, 15.5)
sky = P("sageD") * 0.55 + P("ink") * 0.45; land = P("sageD") * 0.9
render(32, 32, [(circ, sky), (np.minimum(circ, soft(y - 18)), land), (np.minimum(circ, box(x, y, 0, 17.6, 32, 18.8)), P("sage")),
                (np.minimum(circ, np.minimum(soft(np.hypot(x - 16, y - 16) - 14.6), soft(15.5 - np.hypot(x - 16, y - 16)))), P("bevel"))], "world-land-32x32")
print(len([f for f in os.listdir(out) if f.endswith('.png')]), "made")
